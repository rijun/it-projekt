"""App configuration."""
from os import environ

from dotenv import load_dotenv


class Config:
    """Set Flask configuration vars from .env file."""
    load_dotenv()

    # General Config
    FLASK_ENV = environ.get('FLASK_ENV')
    SECRET_KEY = environ.get('SECRET_KEY')
