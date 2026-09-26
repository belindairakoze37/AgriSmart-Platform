from celery import shared_task
from .services import generate_all_forecasts, PriceForecastingService
import logging

logger = logging.getLogger(__name__)


@shared_task
def generate_all_price_forecasts():
    """Weekly task to regenerate all price forecasts"""
    logger.info("Starting price forecast generation...")
    results = generate_all_forecasts()
    logger.info(f"Forecast generation complete: {results}")
    return results


@shared_task
def generate_forecast_for_commodity(commodity_id, market_id=None):
    """Generate forecast for specific commodity/market"""
    service = PriceForecastingService(
        commodity_id=commodity_id,
        market_id=market_id
    )
    forecasts = service.run()
    return {'forecasts_created': len(forecasts)}