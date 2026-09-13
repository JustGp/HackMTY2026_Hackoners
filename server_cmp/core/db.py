from supabase import create_client, Client
from config import load_settings

_client = None

def get_supabase_client() -> Client:
    global _client
    if _client is None:
        settings = load_settings()
        _client = create_client(settings.supabase_url, settings.supabase_key)
    return _client