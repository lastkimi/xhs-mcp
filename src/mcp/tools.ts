// MCP 工具定义 - 只包含实际已实现的工具


export function getTools() {
  return [
    {
      name: 'xhs_login',
      description: '登录小红书账号（会打开浏览器窗口进行登录）',
      inputSchema: {
        type: 'object',
        properties: {},
      },
    },
    {
      name: 'xhs_check_login',
      description: '检查小红书登录状态（返回简单的登录状态信息）',
      inputSchema: {
        type: 'object',
        properties: {},
      },
    },
    {
      name: 'xhs_get_operation_data',
      description: '获取小红书近期笔记运营数据（首页数据、账户统计、粉丝数据）',
      inputSchema: {
        type: 'object',
        properties: {},
      },
    },
    {
      name: 'xhs_get_recent_notes',
      description: '获取近期已发布的笔记列表',
      inputSchema: {
        type: 'object',
        properties: {
          limit: {
            type: 'number',
            description: '限制返回的笔记数量，默认为20',
            default: 20,
          },
        },
      },
    },
    {
      name: 'xhs_get_note_detail',
      description: '根据笔记ID获取笔记详情（包括标题、内容、标签、图片等）',
      inputSchema: {
        type: 'object',
        properties: {
          noteId: {
            type: 'string',
            description: '笔记ID',
          },
        },
        required: ['noteId'],
      },
    },
    {
      name: 'xhs_read_posting_guidelines',
      description: '读取发帖指导原则并生成发帖计划建议。注意：要添加待发布的笔记，请使用 xhs_create_or_update_post 工具，传入标题和内容等参数。标题将作为唯一键，如果已存在相同标题的笔记则会更新。',
      inputSchema: {
        type: 'object',
        properties: {
          generatePlan: {
            type: 'boolean',
            description: '是否生成下周发帖计划，默认为true',
            default: true,
          },
        },
      },
    },
    {
      name: 'xhs_get_my_profile',
      description: '获取当前登录用户的资料信息（包括账户名、粉丝数、关注数、获赞与收藏等）',
      inputSchema: {
        type: 'object',
        properties: {},
      },
    },
    {
      name: 'xhs_list_queue_posts',
      description: '读取已经写好的，准备发布的笔记列表',
      inputSchema: {
        type: 'object',
        properties: {},
      },
    },
    {
      name: 'xhs_get_queue_post_detail',
      description: '根据文件名获取待发布笔记的详情（包括标题、内容、图片、标签等）',
      inputSchema: {
        type: 'object',
        properties: {
          filename: {
            type: 'string',
            description: '待发布笔记的文件名（.json文件）',
          },
        },
        required: ['filename'],
      },
    },
    {
      name: 'xhs_create_or_update_post',
      description: '创建或更新待发布的笔记文件，添加到发布队列。创建后的笔记可以通过 post 命令发布到小红书。',
      inputSchema: {
        type: 'object',
        properties: {
          title: {
            type: 'string',
            description: '笔记标题（作为唯一键）',
          },
          content: {
            type: 'string',
            description: '笔记内容（必需）',
          },
          tags: {
            type: 'array',
            items: {
              type: 'string',
            },
            description: '标签数组（可选），如 ["#MCP", "#AI"]',
          },
          scheduledPublishTime: {
            type: 'string',
            description: '计划发布时间（一般不需要，除非用户明确指定），ISO 8601 格式，如 "2024-01-01T10:00:00Z"',
          },
        },
        required: ['title', 'content'],
      },
    },
    {
      name: 'xhs_generate_cover',
      description: '为指定的笔记生成发布需要的封面图片',
      inputSchema: {
        type: 'object',
        properties: {
          postName: {
            type: 'string',
            description: '笔记名称（queue文件名，不包含.json后缀）',
          },
        },
        required: ['postName'],
      },
    },
    {
      name: 'xhs_post',
      description: '发布指定的笔记到小红书。需要传入笔记的文件名（queue文件名，不包含.json后缀）',
      inputSchema: {
        type: 'object',
        properties: {
          postName: {
            type: 'string',
            description: '笔记名称（queue文件名，不包含.json后缀）',
          },
        },
        required: ['postName'],
      },
    },
    {
      name: 'xhs_save_example',
      description: '保存范文（txt格式，文件名必须以.txt结尾）',
      inputSchema: {
        type: 'object',
        properties: {
          filename: {
            type: 'string',
            description: '范文文件名（必须以.txt结尾）',
          },
          content: {
            type: 'string',
            description: '范文内容（纯文本，不支持Markdown）',
          },
        },
        required: ['filename', 'content'],
      },
    },
  ];
}
