// MCP 格式化工具 - 统一CLI和MCP的输出格式

export interface MCPContent {
  type: 'text';
  text: string;
}

export interface MCPResponse {
  content: MCPContent[];
  isError?: boolean;
}

/**
 * 格式化数据为MCP响应格式
 * @param data 原始数据
 * @param formatter 格式化函数，将数据转换为可读文本
 * @returns MCP格式的响应
 */
export function formatForMCP<T>(
  data: T,
  formatter: (data: T) => string
): MCPResponse {
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(data, null, 2),
      },
      {
        type: 'text',
        text: formatter(data),
      },
    ],
  };
}

/**
 * 格式化错误为MCP响应格式
 */
export function formatErrorForMCP(error: unknown): MCPResponse {
  return {
    content: [
      {
        type: 'text',
        text: `错误: ${error instanceof Error ? error.message : String(error)}`,
      },
    ],
    isError: true,
  };
}

/**
 * 从MCP响应中提取文本内容（用于CLI打印）
 */
export function extractTextFromMCP(response: MCPResponse): string {
  // 优先返回格式化文本，如果没有则返回JSON
  if (response.content.length > 1) {
    return response.content[1].text;
  }
  return response.content[0].text;
}

