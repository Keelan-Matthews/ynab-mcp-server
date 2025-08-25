import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { Props } from "../types";
import Freecurrencyapi from "@everapi/freecurrencyapi-js";

export function registerCurrencyTools(server: McpServer, env: Env, props: Props) {
  server.tool(
    "convertToZAR",
    "Convert an amount from any currency (except ZAR) into ZAR",
    {
      // Accept only integer milliunits (YNAB-style): 1 unit = 1000 milliunits.
      // Example: 10500 represents 10.5 units.
      amount: z.number().int().describe("Amount in the source currency milliunits (integer). Example: 10500 = 10.5 units."),
      currency: z.string().length(3).describe("ISO 4217 3-letter currency code for the source currency (e.g. USD, EUR). Do NOT pass ZAR."),
    },
    async (args) => {
      const src = args.currency?.toUpperCase?.() || "";
      const amount = args.amount;
      if (!src || src === "ZAR") {
        return {
          content: [
            {
              type: "text",
              text: "**Error**\n\nPlease provide a valid non-ZAR 3-letter currency code as `currency`.",
              isError: true,
            },
          ],
        };
      }

      const apiKey = (env as any).FREECURRENCY_API_KEY;
      if (!apiKey) {
        return {
          content: [
            {
              type: "text",
              text: "**Error**\n\nFREECURRENCY_API_KEY is not configured in the environment.",
              isError: true,
            },
          ],
        };
      }

      try {
        // Use the statically-imported Freecurrencyapi client (package must be installed).
        const client = new Freecurrencyapi(apiKey as string);
        const res: any = await client.latest({ base_currency: src, currencies: "ZAR" });

        // The Freecurrencyapi returns { data: { ZAR: <rate> } }
        const rate = res && res.data && typeof res.data.ZAR === "number" ? res.data.ZAR : null;

        if (rate === null) {
          return {
            content: [
              {
                type: "text",
                text: `**Error**\n\nCould not determine ZAR rate from Freecurrencyapi response: ${JSON.stringify(res)}`,
                isError: true,
              },
            ],
          };
        }

        // Require integer milliunits input
        const milliAmount = amount as number;
        if (typeof milliAmount !== "number" || !Number.isInteger(milliAmount)) {
          return {
            content: [{ type: "text", text: "**Error**\n\n`amount` must be an integer number of milliunits (e.g. 10500).", isError: true }],
          };
        }

        // Convert milliunits -> units, apply rate (1 SRC = rate ZAR)
        const srcUnits = milliAmount / 1000; // e.g. 10500 -> 10.5
        const convertedUnits = srcUnits * rate; // ZAR units
        const convertedZAR = +convertedUnits.toFixed(2);
        const convertedMilli = Math.round(convertedUnits * 1000); // ZAR milliunits (integer)

        return {
          content: [
            {
              type: "text",
              text: `**Conversion Result**\n\n${milliAmount} ${src} milliunits (${srcUnits.toFixed(3)} ${src}) → ${convertedZAR} ZAR (${convertedMilli} ZAR milliunits)\n\nRate used: 1 ${src} = ${rate} ZAR`,
            },
          ],
        };
      } catch (err: any) {
        return {
          content: [
            {
              type: "text",
              text: `**Error**\n\nCurrency conversion failed: ${err instanceof Error ? err.message : String(err)}`,
              isError: true,
            },
          ],
        };
      }
    },
  );
}

export default registerCurrencyTools;
