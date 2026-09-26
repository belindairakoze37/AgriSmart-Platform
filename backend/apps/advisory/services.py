"""
Smart Agricultural Advisor
Uses rule-based + LLM hybrid approach for reliability
"""
import os
from typing import Dict, List, Optional
from django.conf import settings
from openai import OpenAI
import logging

logger = logging.getLogger(__name__)


# Agricultural knowledge base (simplified - expand with real data)
KNOWLEDGE_BASE = {
    'maize': {
        'planting': {
            'season': 'March-April (first rains) or August-September (second rains)',
            'spacing': '75cm x 25cm',
            'depth': '2.5-5cm',
            'seed_rate': '20-25 kg/ha',
            'varieties': ['Longe 5', 'Longe 10H', 'Bazooka', 'DK8031'],
        },
        'fertilizer': {
            'planting': 'DAP or NPK 23:21:0+4S at 50kg/acre',
            'top_dressing': 'Urea at 50kg/acre when knee-high',
        },
        'pests': {
            'fall_armyworm': {
                'symptoms': 'Ragged holes in leaves, sawdust-like frass in whorl',
                'control': [
                    'Scout regularly, especially early morning',
                    'Apply recommended insecticides (e.g., Ampligo, Match)',
                    'Handpick and destroy egg masses',
                    'Plant early and uniformly',
                ],
            },
            'stem_borer': {
                'symptoms': 'Dead heart, holes in stems',
                'control': ['Apply insecticides', 'Destroy crop residues'],
            },
        },
        'diseases': {
            'maize_streak': {
                'symptoms': 'Yellow streaks on leaves, stunted growth',
                'control': ['Plant resistant varieties', 'Control leafhoppers'],
            },
            'gray_leaf_spot': {
                'symptoms': 'Gray-brown rectangular lesions',
                'control': ['Crop rotation', 'Fungicide application'],
            },
        },
        'harvest': {
            'time': '90-120 days after planting',
            'moisture': 'Harvest at 20-25% moisture, dry to 13-14%',
            'storage': 'Store in dry, well-ventilated area. Use hermetic bags for long storage.',
        },
    },
    'beans': {
        'planting': {
            'season': 'March-April or August-September',
            'spacing': '50cm x 10cm',
            'seed_rate': '50-60 kg/ha',
            'varieties': ['NABE 15', 'NABE 17', 'K132', 'Kabulangeti'],
        },
        'fertilizer': {
            'planting': 'NPK 17:17:17 at 50kg/acre',
        },
        'pests': {
            'bean_fly': {
                'symptoms': 'Yellow patches on leaves, stunted growth',
                'control': ['Use resistant varieties', 'Apply insecticides'],
            },
        },
        'diseases': {
            'bean_common_mosaic': {
                'symptoms': 'Mottled leaves, curling',
                'control': ['Use certified seeds', 'Control aphids'],
            },
            'anthracnose': {
                'symptoms': 'Dark sunken lesions on pods and stems',
                'control': ['Crop rotation', 'Fungicide'],
            },
        },
    },
    'tomatoes': {
        'planting': {
            'nursery': '4-6 weeks before transplanting',
            'spacing': '60cm x 60cm',
            'varieties': ['Roma', 'Money Maker', 'Tengeru 97', 'Anna F1'],
        },
        'diseases': {
            'early_blight': {
                'symptoms': 'Brown spots with concentric rings on lower leaves',
                'control': [
                    'Remove affected leaves',
                    'Apply fungicide (e.g., Mancozeb, Copper)',
                    'Mulch to prevent soil splash',
                    'Crop rotation',
                ],
            },
            'late_blight': {
                'symptoms': 'Water-soaked lesions, white mold on leaf undersides',
                'control': [
                    'Apply fungicide immediately',
                    'Remove and destroy affected plants',
                    'Improve air circulation',
                ],
            },
            'bacterial_spot': {
                'symptoms': 'Small dark water-soaked spots on leaves and fruits',
                'control': [
                    'Use copper-based bactericide',
                    'Remove affected plants',
                    'Avoid overhead watering',
                ],
            },
            'yellow_leaf_curl': {
                'symptoms': 'Yellowing, curling of leaves, stunted growth',
                'control': [
                    'Control whiteflies (vectors)',
                    'Remove infected plants',
                    'Use resistant varieties',
                ],
            },
        },
    },
}


class AdvisoryService:
    """Hybrid advisory service: rule-based + LLM"""
    
    def __init__(self):
        self.client = None
        if settings.OPENAI_API_KEY:
            self.client = OpenAI(api_key=settings.OPENAI_API_KEY)
    
    def classify_intent(self, message: str) -> str:
        """Simple keyword-based intent classification"""
        message_lower = message.lower()
        
        if any(word in message_lower for word in ['plant', 'when to plant', 'planting']):
            return 'planting'
        if any(word in message_lower for word in ['fertilizer', 'fertiliser', 'npk', 'urea', 'dap']):
            return 'fertilizer'
        if any(word in message_lower for word in ['pest', 'insect', 'worm', 'armyworm', 'aphid']):
            return 'pest'
        if any(word in message_lower for word in ['disease', 'spots', 'blight', 'wilt', 'mold']):
            return 'disease'
        if any(word in message_lower for word in ['harvest', 'when to harvest']):
            return 'harvest'
        if any(word in message_lower for word in ['store', 'storage', 'keep']):
            return 'storage'
        if any(word in message_lower for word in ['price', 'market', 'sell']):
            return 'market'
        
        return 'general'
    
    def get_knowledge(self, crop: str, intent: str) -> Optional[Dict]:
        """Retrieve relevant knowledge from base"""
        crop = crop.lower()
        if crop in KNOWLEDGE_BASE and intent in KNOWLEDGE_BASE[crop]:
            return KNOWLEDGE_BASE[crop][intent]
        return None
    
    def get_advice(
        self,
        message: str,
        crop: str = '',
        location: str = '',
        language: str = 'en',
        context: Optional[Dict] = None
    ) -> Dict:
        """
        Get agricultural advice
        Returns dict with content, intent, sources, confidence
        """
        intent = self.classify_intent(message)
        knowledge = self.get_knowledge(crop, intent) if crop else None
        
        # Build prompt
        prompt = self._build_prompt(message, crop, location, language, intent, knowledge, context)
        
        # Try LLM first if available
        if self.client:
            try:
                response = self.client.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=[
                        {"role": "system", "content": self._get_system_prompt(language)},
                        {"role": "user", "content": prompt}
                    ],
                    temperature=0.3,
                    max_tokens=800,
                )
                
                content = response.choices[0].message.content
                return {
                    'content': content,
                    'intent': intent,
                    'sources': self._get_sources(intent),
                    'confidence': 0.85,
                }
            except Exception as e:
                logger.error(f"LLM error: {str(e)}")
        
        # Fallback to rule-based
        return self._rule_based_response(intent, crop, knowledge, language)
    
    def _get_system_prompt(self, language: str) -> str:
        return f"""You are an expert agricultural extension officer in Uganda.
Provide practical, actionable advice to smallholder farmers.
Be specific about:
1. What the problem likely is
2. Immediate steps to take
3. Preventive measures
4. When to seek professional help

Use simple language. If unsure, say so and recommend consulting a local extension officer.
Respond in {'English' if language == 'en' else language}.

IMPORTANT: Always present advice as guidance, not guarantees. Mention that farmers should 
verify with local extension officers for critical decisions."""
    
    def _build_prompt(self, message, crop, location, language, intent, knowledge, context) -> str:
        parts = [f"Farmer's question: {message}"]
        
        if crop:
            parts.append(f"Crop: {crop}")
        if location:
            parts.append(f"Location: {location}")
        if context:
            if context.get('growth_stage'):
                parts.append(f"Growth stage: {context['growth_stage']}")
            if context.get('weather'):
                parts.append(f"Current weather: {context['weather']}")
        
        if knowledge:
            parts.append(f"\nRelevant knowledge base:\n{knowledge}")
        
        return "\n".join(parts)
    
    def _get_sources(self, intent: str) -> List[str]:
        sources = {
            'planting': ['MAAIF Crop Production Guide', 'NARO Recommendations'],
            'fertilizer': ['MAAIF Fertilizer Guidelines', 'Soil Fertility Handbook'],
            'pest': ['MAAIF Pest Management Guide', 'CABI Pest Database'],
            'disease': ['MAAIF Disease Management', 'PlantVillage'],
            'harvest': ['Post-Harvest Handling Guide', 'FAO Standards'],
            'storage': ['Post-Harvest Storage Guide', 'NARO Guidelines'],
            'market': ['MAAIF Market Information', 'Farmgain Africa'],
        }
        return sources.get(intent, ['General Agricultural Knowledge'])
    
    def _rule_based_response(self, intent, crop, knowledge, language) -> Dict:
        """Fallback rule-based response"""
        if knowledge:
            content = self._format_knowledge(knowledge, intent, crop)
            return {
                'content': content,
                'intent': intent,
                'sources': self._get_sources(intent),
                'confidence': 0.7,
            }
        
        content = (
            "I don't have specific information for this question right now. "
            "For accurate advice, please:\n\n"
            "1. Contact your local agricultural extension officer\n"
            "2. Visit the nearest MAAIF office\n"
            "3. Call the agricultural helpline\n\n"
            "You can also try rephrasing your question with more details about "
            "your crop and location."
        )
        
        return {
            'content': content,
            'intent': intent,
            'sources': [],
            'confidence': 0.3,
        }
    
    def _format_knowledge(self, knowledge: Dict, intent: str, crop: str) -> str:
        """Format knowledge base entry into readable response"""
        lines = [f"Here's information about {intent} for {crop}:\n"]
        
        for key, value in knowledge.items():
            if isinstance(value, list):
                lines.append(f"\n{key.replace('_', ' ').title()}:")
                for item in value:
                    lines.append(f"  • {item}")
            elif isinstance(value, dict):
                lines.append(f"\n{key.replace('_', ' ').title()}:")
                for k, v in value.items():
                    lines.append(f"  • {k.replace('_', ' ').title()}: {v}")
            else:
                lines.append(f"\n{key.replace('_', ' ').title()}: {value}")
        
        lines.append(
            "\n\n⚠️ This is general guidance. For specific advice, "
            "consult your local agricultural extension officer."
        )
        
        return "\n".join(lines)