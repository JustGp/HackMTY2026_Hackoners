from mcp.server.mcpserver import MCPServer
from tools import ejecutar_herramienta

mcp = MCPServer("supabase-finanzas-mcp")

@mcp.tool()
def comparar_meses(usuario_id: str, parametros: dict) -> dict:
    return ejecutar_herramienta("comparar_meses", usuario_id, parametros)

@mcp.tool()
def resumen_categoria(usuario_id: str, parametros: dict) -> dict:
    return ejecutar_herramienta("resumen_categoria", usuario_id, parametros)

if __name__ == "__main__":
    mcp.run(transport="stdio")