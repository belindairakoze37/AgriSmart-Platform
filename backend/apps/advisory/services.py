"""
Smart Agricultural Advisor
Uses rule-based + LLM hybrid approach for reliability
"""
import re
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

CROP_ALIASES = {
    'maize': ('maize', 'corn'),
    'beans': ('bean', 'beans'),
    'tomatoes': ('tomato', 'tomatoes'),
}


class AdvisoryService:
    """Hybrid advisory service: rule-based + LLM"""
    
    def __init__(self):
        self.client = None
        if settings.OPENAI_API_KEY:
            self.client = OpenAI(
                api_key=settings.OPENAI_API_KEY,
                timeout=10.0,
                max_retries=0,
            )
    
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

    def resolve_crop(self, crop: str, message: str) -> str:
        """Choose a supported crop from the question or farmer profile context."""
        question = message.casefold()
        for supported_crop, aliases in CROP_ALIASES.items():
            if any(
                re.search(rf'\b{re.escape(alias)}\b', question)
                for alias in aliases
            ):
                return supported_crop

        context = crop.casefold()
        for raw_crop in re.split(r'[,;/]', context):
            normalized_crop = raw_crop.strip()
            for supported_crop, aliases in CROP_ALIASES.items():
                if normalized_crop == supported_crop or normalized_crop in aliases:
                    return supported_crop
        return crop.strip().lower()
    
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
        resolved_crop = self.resolve_crop(crop, message)
        knowledge = self.get_knowledge(resolved_crop, intent) if resolved_crop else None
        
        # Build prompt
        prompt = self._build_prompt(
            message,
            resolved_crop,
            location,
            language,
            intent,
            knowledge,
            context,
        )
        
        fallback_reason = 'not_configured'
        if self.client:
            try:
                response = self.client.chat.completions.create(
                    model=settings.OPENAI_MODEL,
                    messages=[
                        {"role": "system", "content": self._get_system_prompt(language)},
                        {"role": "user", "content": prompt}
                    ],
                    temperature=0.3,
                    max_tokens=800,
                )
                
                content = response.choices[0].message.content
                if content and content.strip():
                    return {
                        'content': content.strip(),
                        'intent': intent,
                        'sources': self._get_sources(intent),
                        'confidence': 0.85,
                        'metadata': {
                            'provider': 'openai',
                            'mode': 'ai',
                        },
                    }
                fallback_reason = 'empty_response'
                logger.warning('OpenAI advisor returned an empty response.')
            except Exception as error:
                fallback_reason = 'provider_error'
                logger.warning(
                    'OpenAI advisor request failed (%s); using local guidance.',
                    type(error).__name__,
                )
        
        return self._rule_based_response(
            intent,
            resolved_crop,
            knowledge,
            language,
            fallback_reason=fallback_reason,
        )
    
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

IMPORTANT:
- Present advice as guidance, not guarantees.
- Never claim to have diagnosed a crop without enough information or an image.
- Never invent product labels, pesticide rates, local weather, prices, or citations.
- Ask a short follow-up when crop, symptoms, location, or growth stage is important.
- Recommend local extension officers for severe outbreaks or chemical safety decisions."""
    
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
    
    def _rule_based_response(
        self,
        intent,
        crop,
        knowledge,
        language,
        fallback_reason='not_configured',
    ) -> Dict:
        """Fallback rule-based response"""
        if knowledge:
            content = self._format_knowledge(knowledge, intent, crop)
            return {
                'content': content,
                'intent': intent,
                'sources': self._get_sources(intent),
                'confidence': 0.7,
                'metadata': {
                    'provider': 'rule_based',
                    'mode': 'fallback',
                    'fallback_reason': fallback_reason,
                },
            }
        
        responses = {
            'planting': (
                f"For {crop or 'your crop'}, planting dates depend on your district, "
                "rainfall, and variety. Prepare well-drained soil, use healthy seed, "
                "and plant when the rains are established rather than into dry soil. "
                "Tell me your district and crop variety for more specific guidance."
            ),
            'fertilizer': (
                f"For {crop or 'your crop'}, fertilizer needs depend on soil and crop "
                "stage. Use a soil test or local extension recommendation where possible, "
                "apply only the rate on the product label, and keep fertilizer away from "
                "direct contact with seed and stems. What crop and growth stage are you asking about?"
            ),
            'pest': (
                f"For pests on {crop or 'your crop'}, inspect several plants and check "
                "leaf undersides and growing points before choosing a control. Remove "
                "small affected areas where practical, protect beneficial insects, and "
                "use pesticides only when identified and label-approved. Describe the pest "
                "and symptoms, and include your district."
            ),
            'disease': (
                f"I can't confirm a disease on {crop or 'your crop'} from a text question "
                "alone. Note which leaves are affected, the pattern and color of spots, "
                "recent rain, and how quickly it is spreading. Remove severely affected "
                "plant material where safe, avoid wetting foliage, and ask a local extension "
                "officer to confirm before applying chemicals. Describe the symptoms and district."
            ),
            'harvest': (
                f"For {crop or 'your crop'}, harvest timing varies by variety and use. "
                "Check maturity signs across several plants and harvest in dry conditions "
                "where possible. Dry produce promptly on a clean surface and store it off "
                "the ground in a dry, ventilated place. Tell me the crop and planting date."
            ),
            'storage': (
                f"To store {crop or 'your produce'}, dry it thoroughly, remove damaged or "
                "infested material, and use clean, dry, pest-resistant storage. Keep bags "
                "off the floor and inspect them regularly. What produce are you storing, "
                "and is it grain, seed, or fresh produce?"
            ),
            'market': (
                "Compare prices for the same crop, quality, unit, and date in nearby "
                "markets. Include transport, handling, and storage costs before deciding "
                "where to sell. Share your crop, district, quantity, and current offer price "
                "so I can help you compare."
            ),
        }
        content = responses.get(
            intent,
            "I can help with planting, crop care, pests, diseases, harvesting, storage, "
            "and farm-market questions. Please tell me the crop, your district, what you "
            "observe, and what you have already tried. For chemical use or a serious "
            "outbreak, confirm recommendations with a local agricultural extension officer.",
        )
        
        return {
            'content': content,
            'intent': intent,
            'sources': self._get_sources(intent),
            'confidence': 0.45,
            'metadata': {
                'provider': 'rule_based',
                'mode': 'fallback',
                'fallback_reason': fallback_reason,
            },
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