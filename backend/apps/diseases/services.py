"""
Crop Disease Detection Service
Uses a pre-trained CNN model for image classification
"""
import os
from typing import Dict, List
from django.conf import settings
import logging

logger = logging.getLogger(__name__)


class DiseaseModelUnavailableError(RuntimeError):
    message = (
        'Crop disease detection is not available because a trained model '
        'has not been installed.'
    )


# Disease classes and recommendations
DISEASE_INFO = {
    'Tomato___Bacterial_spot': {
        'name': 'Bacterial Spot',
        'crop': 'Tomato',
        'severity': 'high',
        'immediate': [
            'Remove and destroy infected leaves immediately',
            'Apply copper-based bactericide',
            'Avoid overhead watering to reduce spread',
        ],
        'preventive': [
            'Use certified disease-free seeds',
            'Practice 3-year crop rotation',
            'Maintain proper plant spacing for air circulation',
            'Disinfect tools between uses',
        ],
    },
    'Tomato___Early_blight': {
        'name': 'Early Blight',
        'crop': 'Tomato',
        'severity': 'medium',
        'immediate': [
            'Remove affected lower leaves',
            'Apply fungicide (Mancozeb or Chlorothalonil)',
            'Mulch around plants to prevent soil splash',
        ],
        'preventive': [
            'Crop rotation with non-solanaceous crops',
            'Stake plants for better air circulation',
            'Water at base, not on leaves',
            'Remove crop debris after harvest',
        ],
    },
    'Tomato___Late_blight': {
        'name': 'Late Blight',
        'crop': 'Tomato',
        'severity': 'critical',
        'immediate': [
            'Apply fungicide immediately (Ridomil or Copper)',
            'Remove and destroy severely affected plants',
            'Harvest healthy fruits early',
            'Improve air circulation',
        ],
        'preventive': [
            'Plant resistant varieties',
            'Avoid overhead irrigation',
            'Monitor weather - disease spreads in cool, wet conditions',
            'Apply preventive fungicides during high-risk periods',
        ],
    },
    'Tomato___healthy': {
        'name': 'Healthy',
        'crop': 'Tomato',
        'severity': 'none',
        'immediate': ['No action needed - plant appears healthy'],
        'preventive': [
            'Continue regular monitoring',
            'Maintain good cultural practices',
            'Keep records of plant health',
        ],
    },
    'Maize___Common_rust': {
        'name': 'Common Rust',
        'crop': 'Maize',
        'severity': 'medium',
        'immediate': [
            'Apply fungicide if severe',
            'Remove severely affected leaves',
        ],
        'preventive': [
            'Plant resistant varieties',
            'Early planting to avoid peak rust season',
            'Balanced fertilization',
        ],
    },
    'Maize___Northern_Leaf_Blight': {
        'name': 'Northern Leaf Blight',
        'crop': 'Maize',
        'severity': 'high',
        'immediate': [
            'Apply fungicide',
            'Remove affected leaves',
        ],
        'preventive': [
            'Crop rotation',
            'Use resistant varieties',
            'Destroy crop residues',
        ],
    },
    'Maize___healthy': {
        'name': 'Healthy',
        'crop': 'Maize',
        'severity': 'none',
        'immediate': ['No action needed'],
        'preventive': ['Continue monitoring'],
    },
}


class DiseaseDetectionService:
    """Service for detecting crop diseases from images"""
    
    def __init__(self):
        self.model = None
        self._load_model()

    @property
    def is_available(self) -> bool:
        return self.model is not None

    def _load_model(self):
        """Load ML model (lazy loading)"""
        try:
            model_path = os.path.join(settings.BASE_DIR, 'ml_models', 'crop_disease_model.pt')
            if os.path.exists(model_path):
                import torch
                self.model = torch.load(model_path, map_location='cpu')
                self.model.eval()
                logger.info("Disease detection model loaded")
            else:
                logger.warning("Disease model not found at %s.", model_path)
        except Exception as e:
            logger.error(f"Failed to load model: {str(e)}")
    
    def detect(self, image_path: str, crop_type: str = '') -> Dict:
        if not self.model:
            raise DiseaseModelUnavailableError(DiseaseModelUnavailableError.message)
        return self._real_detect(image_path, crop_type)
    
    def _real_detect(self, image_path: str, crop_type: str) -> Dict:
        """Real ML inference"""
        import torch
        from PIL import Image
        import torchvision.transforms as transforms
        
        transform = transforms.Compose([
            transforms.Resize(256),
            transforms.CenterCrop(224),
            transforms.ToTensor(),
            transforms.Normalize(
                mean=[0.485, 0.456, 0.406],
                std=[0.229, 0.224, 0.225]
            ),
        ])
        
        image = Image.open(image_path).convert('RGB')
        tensor = transform(image).unsqueeze(0)
        
        with torch.no_grad():
            outputs = self.model(tensor)
            probs = torch.nn.functional.softmax(outputs, dim=1)
        
        # Get top 3 predictions
        top_probs, top_indices = torch.topk(probs, 3)
        
        classes = list(DISEASE_INFO.keys())
        predictions = []
        
        for prob, idx in zip(top_probs[0], top_indices[0]):
            class_name = classes[idx.item()]
            info = DISEASE_INFO.get(class_name, {})
            predictions.append({
                'disease': class_name,
                'name': info.get('name', class_name),
                'confidence': float(prob),
                'severity': info.get('severity', 'unknown'),
            })
        
        top = predictions[0]
        info = DISEASE_INFO.get(top['disease'], {})
        
        return {
            'detected_disease': top['disease'],
            'disease_name': top['name'],
            'confidence': top['confidence'],
            'severity': top['severity'],
            'all_predictions': predictions,
            'immediate_actions': info.get('immediate', []),
            'preventive_measures': info.get('preventive', []),
            'disclaimer': (
                'This is an AI-assisted diagnosis and may not be 100% accurate. '
                'Please consult a local agricultural extension officer for confirmation.'
            ),
        }
    