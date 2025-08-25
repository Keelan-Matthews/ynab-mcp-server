import OAuthProvider from "@cloudflare/workers-oauth-provider";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { McpAgent } from "agents/mcp";
import { Props } from "./types";
import { GitHubHandler } from "./auth/github-handler";
import { registerAllTools } from "./tools/register-tools";
import { getApiKeyFromHeader, validateApiKey, makeServiceProps } from "./auth/api-key";

export class MyMCP extends McpAgent<Env, Record<string, never>, Props> {
	server = new McpServer({
		name: "YNAB MCP Server",
		version: "1.0.0",
	});

	async init() {
		// Register all tools based on user permissions
		registerAllTools(this.server, this.env, this.props);
	}
}

const API_HANDLERS: any = ({
		// Single endpoint wrappers that support both API-key machine access and the original OAuth flow
		'/sse': (function() {
			const orig = (MyMCP as any).serveSSE('/sse');
			return {
				async fetch(req: Request, env: Env, ctx: any) {
					const provided = getApiKeyFromHeader(req);
					if (validateApiKey(provided, env)) {
						const props = makeServiceProps(env);
						if (typeof orig === 'function') return orig.call({ env, props }, req, env, ctx);
						if (orig && typeof orig.fetch === 'function') return orig.fetch.call({ env, props }, req, env, ctx);
						return orig(req, env, ctx);
					}
					if (typeof orig === 'function') return orig(req, env, ctx);
					if (orig && typeof orig.fetch === 'function') return orig.fetch(req, env, ctx);
					return orig(req, env, ctx);
				}
			} as any;
		})(),
		'/mcp': (function() {
			const orig = (MyMCP as any).serve('/mcp');
			return {
				async fetch(req: Request, env: Env, ctx: any) {
					const provided = getApiKeyFromHeader(req);
					if (validateApiKey(provided, env)) {
						const props = makeServiceProps(env);
						if (typeof orig === 'function') return orig.call({ env, props }, req, env, ctx);
						if (orig && typeof orig.fetch === 'function') return orig.fetch.call({ env, props }, req, env, ctx);
						return orig(req, env, ctx);
					}
					if (typeof orig === 'function') return orig(req, env, ctx);
					if (orig && typeof orig.fetch === 'function') return orig.fetch(req, env, ctx);
					return orig(req, env, ctx);
				}
			} as any;
		})(),
	} as any );

export { API_HANDLERS };

const __PROVIDER = new OAuthProvider({
	apiHandlers: API_HANDLERS as any,
	authorizeEndpoint: "/authorize",
	clientRegistrationEndpoint: "/register",
	defaultHandler: GitHubHandler as any,
	tokenEndpoint: "/token",
});

// Top-level wrapper: honor X-API-Key (or X-API-Key) for machine access to /mcp and /sse
export default {
	async fetch(req: Request, env: Env, ctx: any) {
		try {
			const url = new URL(req.url);
			const path = url.pathname;
			const xkey = req.headers.get('x-api-key') || req.headers.get('X-API-Key') || null;
			if (xkey && validateApiKey(xkey.trim(), env)) {
				if (path === '/mcp' && API_HANDLERS['/mcp']) return API_HANDLERS['/mcp'].fetch(req, env, ctx);
				if (path === '/sse' && API_HANDLERS['/sse']) return API_HANDLERS['/sse'].fetch(req, env, ctx);
				if (path === '/debug' && API_HANDLERS['/debug']) return API_HANDLERS['/debug'].fetch(req, env, ctx);
			}
		} catch (e) {
			// fall through to provider for any unexpected error
		}
		return __PROVIDER.fetch(req, env, ctx);
	}
};