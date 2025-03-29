// app/api/finance/route.ts
import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import type { ChartData, ChartConfig } from "@/types/chart"; // Ensure ChartConfig is imported if used

// Initialize Anthropic client
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY!, });
export const runtime = "edge";

// Helper (keep)
const isValidBase64 = (str: string) => { try { return btoa(atob(str)) === str; } catch(e) { return false; } };

// Types (keep)
interface ChartToolResponse extends ChartData {}
interface ToolSchema {
  name: string;
  description: string;
  input_schema: {
    type: "object";
    properties: Record<string, unknown>;
    required: string[];
  };
}

// Tool definition (ensure this is correct and complete)
const tools: ToolSchema[] = [
  {
    name: "generate_graph_data",
    description:
      "Generate structured JSON data for creating financial charts and graphs.",
    input_schema: {
      type: "object" as const,
      properties: {
        chartType: {
          type: "string" as const,
          enum: ["bar", "multiBar", "line", "pie", "area", "stackedArea"] as const,
          description: "The type of chart to generate",
        },
        config: {
          type: "object" as const,
          properties: {
            title: { type: "string" as const },
            description: { type: "string" as const },
            trend: {
              type: "object" as const,
              properties: {
                percentage: { type: "number" as const },
                direction: { type: "string" as const, enum: ["up", "down"] as const, },
              },
              // Trend is optional, don't require it here unless always needed
              // required: ["percentage", "direction"],
            },
            footer: { type: "string" as const },
            totalLabel: { type: "string" as const },
            xAxisKey: { type: "string" as const },
          },
          required: ["title", "description"],
        },
        data: {
          type: "array" as const,
          items: { type: "object" as const, additionalProperties: true, },
        },
        chartConfig: {
          type: "object" as const,
          additionalProperties: {
            type: "object" as const,
            properties: {
              label: { type: "string" as const },
              stacked: { type: "boolean" as const },
            },
            required: ["label"],
          },
          description: "Configuration for chart series (lines, bars, pie slices)",
        },
      },
      required: ["chartType", "config", "data", "chartConfig"],
    },
  },
];


export async function POST(req: NextRequest) {
  console.log("API /api/finance called (Authentication Skipped)");

  try {
    const { messages, fileData, model } = await req.json();

    console.log("🔍 Initial Request Data:", {
        hasMessages: !!messages, messageCount: messages?.length, hasFileData: !!fileData, fileType: fileData?.mediaType, model
    });

    // Input validation
    if (!messages || !Array.isArray(messages)) { return new NextResponse(JSON.stringify({ error: "Messages array is required" }), { status: 400 }); }
    if (!model) { return new NextResponse(JSON.stringify({ error: "Model selection is required" }), { status: 400 }); }

    // Construct messages (including file handling logic)
    let anthropicMessages = messages.map((msg: any) => ({ role: msg.role, content: msg.content }));
    if (fileData) {
      const { base64, mediaType, isText, fileName } = fileData;
      if (!base64) { return new NextResponse(JSON.stringify({ error: "No file data" }), { status: 400 }); }
      try {
        if (isText) {
          const textContent = decodeURIComponent(escape(atob(base64)));
          // Ensure the latest message content is included along with file data
          const lastUserContent = messages.findLast((m: any) => m.role === 'user')?.content || "";
          anthropicMessages[anthropicMessages.length - 1] = { role: "user", content: [ { type: "text", text: `File contents of ${fileName}:\n\n${textContent}` }, { type: "text", text: lastUserContent } ] };
        } else if (mediaType.startsWith("image/")) {
          const lastUserContent = messages.findLast((m: any) => m.role === 'user')?.content || "";
          anthropicMessages[anthropicMessages.length - 1] = { role: "user", content: [ { type: "image", source: { type: "base64", media_type: mediaType, data: base64, } }, { type: "text", text: lastUserContent } ] };
        }
      } catch (error) {
          console.error("Error processing file content:", error);
          return new NextResponse(JSON.stringify({ error: "Failed to process file content" }), { status: 400 });
      }
    }

    console.log("🚀 Final Anthropic API Request (Auth Skipped, With Tools)");
    const response = await anthropic.messages.create({
        model,
        max_tokens: 4096,
        temperature: 0.7,
        tools: tools, // Pass the defined tools array
        tool_choice: { type: "auto" }, // Keep tool_choice
        messages: anthropicMessages,
        // Ensure your full system prompt is here
        system: `You are a financial data visualization expert. Your role is to analyze financial data and create clear, meaningful visualizations using generate_graph_data tool:

Here are the chart types available and their ideal use cases:

1. LINE CHARTS ("line")
   - Time series data showing trends
   - Financial metrics over time
   - Market performance tracking

2. BAR CHARTS ("bar")
   - Single metric comparisons
   - Period-over-period analysis
   - Category performance

3. MULTI-BAR CHARTS ("multiBar")
   - Multiple metrics comparison
   - Side-by-side performance analysis
   - Cross-category insights

4. AREA CHARTS ("area")
   - Volume or quantity over time
   - Cumulative trends
   - Market size evolution

5. STACKED AREA CHARTS ("stackedArea")
   - Component breakdowns over time
   - Portfolio composition changes
   - Market share evolution

6. PIE CHARTS ("pie")
   - Distribution analysis
   - Market share breakdown
   - Portfolio allocation

When generating visualizations:
1. Structure data correctly based on the chart type
2. Use descriptive titles and clear descriptions
3. Include trend information when relevant (percentage and direction)
4. Add contextual footer notes
5. Use proper data keys that reflect the actual metrics

Data Structure Examples:

For Time-Series (Line/Bar/Area):
{
  data: [
    { period: "Q1 2024", revenue: 1250000 },
    { period: "Q2 2024", revenue: 1450000 }
  ],
  config: {
    xAxisKey: "period",
    title: "Quarterly Revenue",
    description: "Revenue growth over time"
  },
  chartConfig: {
    revenue: { label: "Revenue ($)" }
  }
}

For Comparisons (MultiBar):
{
  data: [
    { category: "Product A", sales: 450000, costs: 280000 },
    { category: "Product B", sales: 650000, costs: 420000 }
  ],
  config: {
    xAxisKey: "category",
    title: "Product Performance",
    description: "Sales vs Costs by Product"
  },
  chartConfig: {
    sales: { label: "Sales ($)" },
    costs: { label: "Costs ($)" }
  }
}

For Distributions (Pie):
{
  data: [
    { segment: "Equities", value: 5500000 },
    { segment: "Bonds", value: 3200000 }
  ],
  config: {
    xAxisKey: "segment",
    title: "Portfolio Allocation",
    description: "Current investment distribution",
    totalLabel: "Total Assets"
  },
  chartConfig: {
    equities: { label: "Equities" },
    bonds: { label: "Bonds" }
  }
}

Always:
- Generate real, contextually appropriate data
- Use proper financial formatting
- Include relevant trends and insights
- Structure data exactly as needed for the chosen chart type
- Choose the most appropriate visualization for the data

Never:
- Use placeholder or static data
- Announce the tool usage
- Include technical implementation details in responses
- NEVER SAY you are using the generate_graph_data tool, just execute it when needed.

Focus on clear financial insights and let the visualization enhance understanding.`,
    });

    console.log("✅ Anthropic API Response received (Auth Skipped)");

    // Process response logic starts here
    const toolUseContent = response.content.find((c: any) => c.type === "tool_use");
    const textContent = response.content.find((c: any) => c.type === "text");

    // ---> Corrected processToolResponse function <---
    const processToolResponse = (toolUseContent: any): ChartData | null => {
      // Check if toolUseContent and its input exist
      if (!toolUseContent || !toolUseContent.input) {
        console.warn("processToolResponse called without valid toolUseContent or input.");
        return null;
      }

      const chartData = toolUseContent.input as ChartToolResponse;

      // Validate essential parts of the chart data structure
      if ( !chartData || typeof chartData !== 'object' || !chartData.chartType || !chartData.data || !Array.isArray(chartData.data) || !chartData.chartConfig || typeof chartData.chartConfig !== 'object' || !chartData.config || typeof chartData.config !== 'object' ) {
        console.error("Invalid chart data structure received from tool:", JSON.stringify(chartData, null, 2));
        // Returning null instead of throwing, so the text response can still be shown
        return null;
        // Optionally: throw new Error("Invalid chart data structure received from AI tool.");
      }

      let processedData = [...chartData.data]; // Create a copy to modify if needed

      // Transform data for pie charts if necessary
      if (chartData.chartType === "pie") {
        const segmentKey = chartData.config.xAxisKey || "segment";
        const valueKeys = Object.keys(chartData.chartConfig);
        const primaryValueKey = valueKeys.length > 0 ? valueKeys[0] : 'value'; // Use first key or default to 'value'

        processedData = chartData.data.map((item) => {
          return {
            segment: item[segmentKey] || item.segment || item.category || item.name || 'Unknown',
            value: item[primaryValueKey] || item.value || 0,
          };
        }).filter(item => item.segment !== 'Unknown' && typeof item.value === 'number');

        // Ensure xAxisKey is set correctly for pie charts in the config
        chartData.config.xAxisKey = "segment";
        // Optionally ensure totalLabel exists if needed by pie chart component
        if (!chartData.config.totalLabel) chartData.config.totalLabel = "Total";
      }

      // --- This is the previously missing reduce logic ---
      // Create new chartConfig with added color properties
      const processedChartConfig = Object.entries(chartData.chartConfig).reduce<ChartConfig>(
        (acc, [key, configValue], index) => {
          // Make sure configValue is a valid object, provide default if not
          const currentConfig = typeof configValue === 'object' && configValue !== null
             ? configValue
             : { label: key }; // Use key as label if config is missing/invalid

          acc[key] = {
             ...(currentConfig as object), // Spread the existing config properties (asserting it's an object now)
             label: currentConfig.label || key, // Ensure label exists
             // Assign color variables sequentially, cycling through 5 colors
             color: `hsl(var(--chart-${(index % 5) + 1}))`,
          };
          return acc;
        },
        {} // Initial value for the accumulator (empty object)
      );
      // --- End of restored reduce logic ---

      // Return the fully processed chart data object
      return {
        ...chartData, // Spread original data
        data: processedData, // Use potentially modified data (for pie chart)
        chartConfig: processedChartConfig, // Use the config with added colors
      };
    };
    // ---> End of corrected function <---

    const processedChartData = toolUseContent ? processToolResponse(toolUseContent) : null;

    // Log if processing failed after tool use
    if (toolUseContent && !processedChartData) {
        console.warn("Tool use detected but chart data processing failed. Returning text only.");
    }

    // Return successful response
    return new NextResponse(
      JSON.stringify({
        content: textContent?.text || (processedChartData ? "Generated a chart." : ""), // Provide default text if chart exists but text doesn't
        hasToolUse: !!toolUseContent,
        // toolUse: toolUseContent, // Decide if client needs raw toolUse block
        chartData: processedChartData, // Send processed (or null) data
      }),
      { headers: { "Content-Type": "application/json", "Cache-Control": "no-cache", }, }
    );

  } catch (error) {
     console.error(`❌ Finance API Error (Auth Skipped)`, error);
     const errorDetails = error instanceof Error ? error.message : "An internal server error occurred.";
     let status = 500;
     if (error instanceof Anthropic.APIError) { status = error.status || 500; }
     // Ensure errors are always returned as JSON
     return new NextResponse(
         JSON.stringify({ error: "API Processing Error", details: errorDetails }),
         { status: status, headers: { 'Content-Type': 'application/json' } }
     );
  }
}