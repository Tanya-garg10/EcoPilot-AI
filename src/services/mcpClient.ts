/**
 * Real Model Context Protocol (MCP) Streamable HTTP Client
 * Conforms to MCP Specification 2025-11-25
 * Sends authentic JSON-RPC 2.0 messages over Streamable HTTP transport:
 * 1. initialize
 * 2. notifications/initialized
 * 3. tools/list (Tool Discovery)
 * 4. tools/call (Tool Execution)
 */

export interface McpTool {
  name: string;
  description: string;
  inputSchema: {
    type: string;
    properties: Record<string, any>;
    required?: string[];
  };
}

export interface McpToolActivity {
  id: string;
  timestamp: string;
  toolName: string;
  sanitizedInput: Record<string, any>;
  status: 'pending' | 'success' | 'error';
  latencyMs: number;
  rawRequest: any;
  rawResponse: any;
  actualResult?: any;
  errorMessage?: string;
  formulaOrAlgorithm?: string;
}

export interface McpServerInfo {
  name: string;
  version: string;
  description?: string;
  protocolVersion: string;
}

export type McpConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

class McpClientService {
  private endpointUrl: string = '/api/mcp';
  private protocolVersion: string = '2025-11-25';
  private sessionId: string | null = null;
  private status: McpConnectionStatus = 'disconnected';
  private serverInfo: McpServerInfo | null = null;
  private tools: McpTool[] = [];
  private resources: any[] = [];
  private prompts: any[] = [];
  private activities: McpToolActivity[] = [];
  private listeners: Array<() => void> = [];
  private requestIdCounter = 1;

  constructor() {
    // Check if user set a custom endpoint in localStorage
    if (typeof window !== 'undefined') {
      const savedEndpoint = localStorage.getItem('ecopilot_mcp_endpoint');
      if (savedEndpoint) {
        this.endpointUrl = savedEndpoint;
      }
    }
  }

  public getSessionId(): string | null {
    return this.sessionId;
  }

  public getProtocolVersion(): string {
    return this.protocolVersion;
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify() {
    this.listeners.forEach((l) => l());
  }

  public getStatus(): McpConnectionStatus {
    return this.status;
  }

  public getEndpointUrl(): string {
    return this.endpointUrl;
  }

  public setEndpointUrl(url: string) {
    this.endpointUrl = url;
    if (typeof window !== 'undefined') {
      localStorage.setItem('ecopilot_mcp_endpoint', url);
    }
    this.status = 'disconnected';
    this.serverInfo = null;
    this.notify();
  }

  public getServerInfo(): McpServerInfo | null {
    return this.serverInfo;
  }

  public getTools(): McpTool[] {
    return this.tools;
  }

  public getActivities(): McpToolActivity[] {
    return [...this.activities].reverse();
  }

  public clearActivities() {
    this.activities = [];
    this.notify();
  }

  public getResources(): any[] {
    return this.resources;
  }

  public getPrompts(): any[] {
    return this.prompts;
  }

  /**
   * Performs the MCP Handshake (Specification 2025-11-25):
   * 1. POST initialize (receives MCP-Session-Id & capabilities)
   * 2. POST notifications/initialized (receives 202 Accepted)
   * 3. POST tools/list (Tool Discovery)
   * 4. POST resources/list (MCP Apps & Resources Discovery)
   * 5. POST prompts/list (Prompt Discovery)
   */
  public async connect(): Promise<boolean> {
    this.status = 'connecting';
    this.notify();

    try {
      const initPayload = {
        jsonrpc: '2.0',
        id: this.requestIdCounter++,
        method: 'initialize',
        params: {
          protocolVersion: this.protocolVersion,
          capabilities: {
            roots: { listChanged: false },
            sampling: {},
          },
          clientInfo: {
            name: 'ecopilot-alexa-client',
            version: '1.2.0',
          },
        },
      };

      const initRes = await fetch(this.endpointUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'MCP-Protocol-Version': this.protocolVersion,
          'X-MCP-Protocol-Version': this.protocolVersion,
        },
        body: JSON.stringify(initPayload),
      });

      if (!initRes.ok) {
        throw new Error(`MCP initialize failed with HTTP ${initRes.status}`);
      }

      // Capture Session ID from response header or payload
      const headerSessionId = initRes.headers.get('mcp-session-id') || initRes.headers.get('x-mcp-session-id');
      const initData = await initRes.json();
      if (initData.error) {
        throw new Error(initData.error.message || 'Initialize error');
      }

      this.sessionId = headerSessionId || initData.result?.sessionId || null;

      this.serverInfo = {
        name: initData.result?.serverInfo?.name || 'mcp-server',
        version: initData.result?.serverInfo?.version || '1.0.0',
        description: initData.result?.serverInfo?.description,
        protocolVersion: initData.result?.protocolVersion || this.protocolVersion,
      };

      // Send initialized notification (Per MCP 2025-11-25 spec: receives 202 Accepted)
      try {
        const notifHeaders: Record<string, string> = {
          'Content-Type': 'application/json',
          'MCP-Protocol-Version': this.protocolVersion,
        };
        if (this.sessionId) notifHeaders['MCP-Session-Id'] = this.sessionId;

        await fetch(this.endpointUrl, {
          method: 'POST',
          headers: notifHeaders,
          body: JSON.stringify({
            jsonrpc: '2.0',
            method: 'notifications/initialized',
          }),
        });
      } catch (e) {
        // notification failures can be non-fatal
      }

      // Discover Tools, Resources, and Prompts
      await Promise.all([
        this.refreshTools(),
        this.refreshResources(),
        this.refreshPrompts(),
      ]);

      this.status = 'connected';
      this.notify();
      return true;
    } catch (err: any) {
      console.warn('MCP connection failed:', err.message);
      this.status = 'error';
      this.notify();
      return false;
    }
  }

  /**
   * Terminates active session via HTTP DELETE (MCP 2025-11-25 spec)
   */
  public async terminateSession(): Promise<boolean> {
    try {
      if (this.sessionId) {
        await fetch(this.endpointUrl, {
          method: 'DELETE',
          headers: {
            'MCP-Session-Id': this.sessionId,
            'MCP-Protocol-Version': this.protocolVersion,
          },
        });
      }
    } catch (e) {
      console.warn('Failed to cleanly terminate MCP session:', e);
    } finally {
      this.sessionId = null;
      this.status = 'disconnected';
      this.notify();
    }
    return true;
  }

  /**
   * Discovers available tools from the MCP server
   */
  public async refreshTools(): Promise<McpTool[]> {
    const listPayload = {
      jsonrpc: '2.0',
      id: this.requestIdCounter++,
      method: 'tools/list',
      params: {},
    };

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'MCP-Protocol-Version': this.protocolVersion,
    };
    if (this.sessionId) headers['MCP-Session-Id'] = this.sessionId;

    const res = await fetch(this.endpointUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(listPayload),
    });

    const data = await res.json();
    if (data.result?.tools) {
      this.tools = data.result.tools;
      this.notify();
      return this.tools;
    }
    return [];
  }

  /**
   * Discovers MCP Resources (including MCP Apps ui:// schemas)
   */
  public async refreshResources(): Promise<any[]> {
    try {
      const payload = {
        jsonrpc: '2.0',
        id: this.requestIdCounter++,
        method: 'resources/list',
        params: {},
      };

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'MCP-Protocol-Version': this.protocolVersion,
      };
      if (this.sessionId) headers['MCP-Session-Id'] = this.sessionId;

      const res = await fetch(this.endpointUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.result?.resources) {
        this.resources = data.result.resources;
        this.notify();
        return this.resources;
      }
    } catch (e) {
      console.warn('Resource discovery notice:', e);
    }
    return [];
  }

  /**
   * Reads resource by URI
   */
  public async readResource(uri: string): Promise<any> {
    const payload = {
      jsonrpc: '2.0',
      id: this.requestIdCounter++,
      method: 'resources/read',
      params: { uri },
    };

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'MCP-Protocol-Version': this.protocolVersion,
    };
    if (this.sessionId) headers['MCP-Session-Id'] = this.sessionId;

    const res = await fetch(this.endpointUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    return await res.json();
  }

  /**
   * Discovers MCP Prompts
   */
  public async refreshPrompts(): Promise<any[]> {
    try {
      const payload = {
        jsonrpc: '2.0',
        id: this.requestIdCounter++,
        method: 'prompts/list',
        params: {},
      };

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'MCP-Protocol-Version': this.protocolVersion,
      };
      if (this.sessionId) headers['MCP-Session-Id'] = this.sessionId;

      const res = await fetch(this.endpointUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.result?.prompts) {
        this.prompts = data.result.prompts;
        this.notify();
        return this.prompts;
      }
    } catch (e) {
      console.warn('Prompt discovery notice:', e);
    }
    return [];
  }

  /**
   * Fetches Agent Skills Catalog
   */
  public async getSkills(): Promise<any[]> {
    try {
      const res = await fetch('/api/mcp/skills');
      const data = await res.json();
      return data.skills || [];
    } catch (e) {
      return [];
    }
  }

  /**
   * Executes a tool through the real MCP Streamable HTTP transport
   */
  public async callTool(toolName: string, rawArgs: Record<string, any>): Promise<any> {
    if (this.status !== 'connected') {
      const connected = await this.connect();
      if (!connected) {
        throw new Error(`Unable to connect to MCP server at ${this.endpointUrl}`);
      }
    }

    // Sanitize and validate inputs
    const sanitizedArgs = this.sanitizeArguments(toolName, rawArgs);

    const callPayload = {
      jsonrpc: '2.0',
      id: this.requestIdCounter++,
      method: 'tools/call',
      params: {
        name: toolName,
        arguments: sanitizedArgs,
      },
    };

    const activityId = `act-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const startTime = performance.now();

    const activity: McpToolActivity = {
      id: activityId,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      toolName,
      sanitizedInput: sanitizedArgs,
      status: 'pending',
      latencyMs: 0,
      rawRequest: callPayload,
      rawResponse: null,
    };

    this.activities.push(activity);
    this.notify();

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'MCP-Protocol-Version': this.protocolVersion,
        'X-MCP-Protocol-Version': this.protocolVersion,
      };
      if (this.sessionId) headers['MCP-Session-Id'] = this.sessionId;

      const res = await fetch(this.endpointUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(callPayload),
      });

      const latencyMs = Math.round(performance.now() - startTime);
      activity.latencyMs = latencyMs;

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }

      const responseJson = await res.json();
      activity.rawResponse = responseJson;

      if (responseJson.error) {
        activity.status = 'error';
        activity.errorMessage = responseJson.error.message || 'MCP Error';
        this.notify();
        throw new Error(responseJson.error.message || 'Tool execution failed');
      }

      // Parse text content from MCP format
      const content = responseJson.result?.content;
      let parsedResult: any = null;
      if (Array.isArray(content) && content[0]?.text) {
        try {
          parsedResult = JSON.parse(content[0].text);
        } catch (e) {
          parsedResult = content[0].text;
        }
      } else {
        parsedResult = responseJson.result;
      }

      activity.status = 'success';
      activity.actualResult = parsedResult;

      // Extract algorithm/formula explanation for transparency panel
      if (toolName === 'optimize_saving_plan') {
        activity.formulaOrAlgorithm =
          '0/1 Knapsack Dynamic Programming: Maximize ∑(monthly_savings) subject to ∑(upfront_cost) ≤ Budget';
      } else if (toolName === 'calculate_energy_usage') {
        activity.formulaOrAlgorithm =
          parsedResult?.formula || 'kWh = (Watts × Hours/Day × Days × Qty) ÷ 1,000';
      } else if (toolName === 'simulate_energy_action') {
        activity.formulaOrAlgorithm =
          parsedResult?.formula_breakdown || 'Delta = Baseline_kWh - Simulated_kWh';
      }

      this.notify();
      return parsedResult;
    } catch (err: any) {
      activity.status = 'error';
      activity.errorMessage = err.message || 'Tool execution failed';
      this.notify();
      throw err;
    }
  }

  /**
   * Sanitizes and bounds input arguments before dispatching
   */
  private sanitizeArguments(toolName: string, args: Record<string, any>): Record<string, any> {
    const sanitized: Record<string, any> = { ...args };

    if (toolName === 'calculate_energy_usage') {
      sanitized.powerWatts = Math.min(25000, Math.max(0, Number(args.powerWatts || 0)));
      sanitized.hoursPerDay = Math.min(24, Math.max(0, Number(args.hoursPerDay || 0)));
      sanitized.daysPerMonth = Math.min(31, Math.max(1, Number(args.daysPerMonth || 30)));
      sanitized.quantity = Math.max(1, Math.floor(Number(args.quantity || 1)));
      sanitized.tariffRate = Math.max(0, Number(args.tariffRate || 8.0));
      sanitized.applianceName = String(args.applianceName || 'Appliance').trim();
    } else if (toolName === 'optimize_saving_plan') {
      sanitized.budget = Math.max(0, Number(args.budget || 0));
      if (args.filterCategory && args.filterCategory !== 'All') {
        sanitized.filterCategory = String(args.filterCategory).trim();
      }
    } else if (toolName === 'simulate_energy_action') {
      sanitized.baselineWatts = Math.max(0, Number(args.baselineWatts || 1500));
      sanitized.baselineHours = Math.min(24, Math.max(0, Number(args.baselineHours || 6)));
      if (args.simulatedHours !== undefined) {
        sanitized.simulatedHours = Math.min(24, Math.max(0, Number(args.simulatedHours)));
      }
      if (args.simulatedWatts !== undefined) {
        sanitized.simulatedWatts = Math.max(0, Number(args.simulatedWatts));
      }
      sanitized.tariffRate = Math.max(0, Number(args.tariffRate || 8.0));
    } else if (toolName === 'estimate_energy_savings') {
      sanitized.actionId = String(args.actionId || '').trim();
      sanitized.tariffRate = Math.max(0, Number(args.tariffRate || 8.0));
    } else if (toolName === 'get_impact_summary') {
      sanitized.tariffRate = Math.max(0, Number(args.tariffRate || 8.0));
    }

    return sanitized;
  }
}

export const mcpClient = new McpClientService();
