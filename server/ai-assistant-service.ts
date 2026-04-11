import OpenAI from "openai";
import { storage } from "./storage";
import type {
  AIConversation,
  AIMessage,
  AICommandLog,
  AIUserPreferences,
  InsertAIConversation,
  InsertAIMessage,
  InsertAICommandLog,
} from "@shared/schema";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface RetryOptions {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
}

async function retryWithExponentialBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = { maxRetries: 3, baseDelay: 1000, maxDelay: 10000 }
): Promise<T> {
  let lastError: any;
  
  for (let attempt = 0; attempt <= options.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      
      if (attempt === options.maxRetries) {
        break;
      }
      
      if (error?.error?.type === 'invalid_request_error') {
        throw error;
      }
      
      if (error?.status && error.status < 500 && error.status !== 429) {
        throw error;
      }
      
      const delay = Math.min(
        options.baseDelay * Math.pow(2, attempt),
        options.maxDelay
      );
      
      console.log(`OpenAI request failed (attempt ${attempt + 1}/${options.maxRetries + 1}). Retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
}

export interface CommandResult {
  success: boolean;
  data?: any;
  error?: string;
  structuredData?: any;
}

export interface ProcessedCommand {
  intent: string;
  commandType: string;
  parameters: Record<string, any>;
  functionToCall: string;
  confidence: number;
}

export interface TaskBreakdown {
  hasMultipleTasks: boolean;
  tasks: {
    description: string;
    userMessage: string;
  }[];
}

export class AIAssistantService {
  private async breakDownMultipleRequests(userMessage: string): Promise<TaskBreakdown> {
    try {
      const completion = await retryWithExponentialBackoff(() =>
        openai.chat.completions.create({
          model: "gpt-4-turbo-preview",
          messages: [
            {
              role: "system",
              content: `You are an expert at analyzing user requests. Determine if a user's message contains multiple distinct tasks or requests.

If the message contains multiple tasks, break them down into separate, clear tasks that can be executed independently.

Return a JSON response with this structure:
{
  "hasMultipleTasks": boolean,
  "tasks": [
    {
      "description": "Brief description of what this task does",
      "userMessage": "The specific request as the user would ask it"
    }
  ]
}

Examples:
- "Show me recent calls and get contact analytics" → Multiple tasks
- "Get my contact analytics" → Single task
- "Create a reminder for tomorrow at 3pm and show me my todos" → Multiple tasks
- "Send an SMS to John saying hello and then check my voicemails" → Multiple tasks

Each task should be standalone and executable independently.`,
            },
            {
              role: "user",
              content: userMessage,
            },
          ],
          response_format: { type: "json_object" },
          temperature: 0.3,
        })
      );

      const response = completion.choices[0].message.content;
      if (!response) {
        return {
          hasMultipleTasks: false,
          tasks: [{ description: "Execute user request", userMessage }],
        };
      }

      const breakdown: TaskBreakdown = JSON.parse(response);
      return breakdown;
    } catch (error) {
      console.error("Error breaking down tasks:", error);
      return {
        hasMultipleTasks: false,
        tasks: [{ description: "Execute user request", userMessage }],
      };
    }
  }

  private async getAvailableFunctions() {
    const functions = [
      {
        name: "search_calls",
        description: "Search and retrieve call history with optional filters",
        parameters: {
          type: "object",
          properties: {
            limit: {
              type: "number",
              description: "Number of calls to return",
            },
            status: {
              type: "string",
              description: "Filter by call status",
              enum: ["completed", "in-progress", "failed", "no-answer"],
            },
            direction: {
              type: "string",
              description: "Filter by call direction",
              enum: ["inbound", "outbound"],
            },
          },
        },
      },
      {
        name: "get_contacts",
        description: "Retrieve contacts from the address book",
        parameters: {
          type: "object",
          properties: {
            search: {
              type: "string",
              description: "Search term to filter contacts by name, email, or phone",
            },
          },
        },
      },
      {
        name: "create_contact",
        description: "Create a new contact in the address book",
        parameters: {
          type: "object",
          properties: {
            firstName: {
              type: "string",
              description: "Contact's first name",
            },
            lastName: {
              type: "string",
              description: "Contact's last name",
            },
            email: {
              type: "string",
              description: "Contact's email address",
            },
            phoneNumber: {
              type: "string",
              description: "Contact's phone number",
            },
            company: {
              type: "string",
              description: "Contact's company name",
            },
          },
          required: ["firstName"],
        },
      },
      {
        name: "send_sms",
        description: "Send an SMS message to a phone number",
        parameters: {
          type: "object",
          properties: {
            to: {
              type: "string",
              description: "Recipient phone number",
            },
            message: {
              type: "string",
              description: "Message content to send",
            },
          },
          required: ["to", "message"],
        },
      },
      {
        name: "get_sms_messages",
        description: "Retrieve SMS messages, optionally filtered by phone number",
        parameters: {
          type: "object",
          properties: {
            phoneNumber: {
              type: "string",
              description: "Filter messages by phone number",
            },
            limit: {
              type: "number",
              description: "Number of messages to return",
            },
          },
        },
      },
      {
        name: "create_todo",
        description: "Create a new todo task or reminder",
        parameters: {
          type: "object",
          properties: {
            title: {
              type: "string",
              description: "Title of the todo task",
            },
            note: {
              type: "string",
              description: "Additional notes or details",
            },
            dueDate: {
              type: "string",
              description: "Due date in ISO format (YYYY-MM-DD)",
            },
            reminderDate: {
              type: "string",
              description: "Reminder date/time in ISO format",
            },
            priority: {
              type: "string",
              description: "Priority level",
              enum: ["none", "low", "medium", "high"],
            },
            categoryId: {
              type: "number",
              description: "Category ID to assign the todo to",
            },
          },
          required: ["title"],
        },
      },
      {
        name: "get_todos",
        description: "Retrieve todo tasks, optionally filtered by category or completion status",
        parameters: {
          type: "object",
          properties: {
            categoryId: {
              type: "number",
              description: "Filter by category ID",
            },
            completed: {
              type: "boolean",
              description: "Filter by completion status",
            },
          },
        },
      },
      {
        name: "complete_todo",
        description: "Mark a todo task as complete",
        parameters: {
          type: "object",
          properties: {
            todoId: {
              type: "number",
              description: "ID of the todo to complete",
            },
          },
          required: ["todoId"],
        },
      },
      {
        name: "create_reminder",
        description: "Create a smart reminder with notification",
        parameters: {
          type: "object",
          properties: {
            title: {
              type: "string",
              description: "Reminder title",
            },
            description: {
              type: "string",
              description: "Reminder description",
            },
            reminderTime: {
              type: "string",
              description: "When to send the reminder (ISO datetime)",
            },
            priority: {
              type: "string",
              enum: ["low", "medium", "high"],
              description: "Reminder priority",
            },
            channels: {
              type: "array",
              items: {
                type: "string",
                enum: ["browser", "sms", "email"],
              },
              description: "Notification channels",
            },
          },
          required: ["title", "reminderTime"],
        },
      },
      {
        name: "get_analytics",
        description: "Get analytics and statistics for calls, contacts, or other metrics",
        parameters: {
          type: "object",
          properties: {
            metric: {
              type: "string",
              description: "Type of analytics to retrieve",
              enum: ["calls", "contacts", "todos", "messages"],
            },
            period: {
              type: "string",
              description: "Time period for analytics",
              enum: ["today", "week", "month", "year"],
            },
          },
          required: ["metric"],
        },
      },
      {
        name: "send_email",
        description: "Send an email message",
        parameters: {
          type: "object",
          properties: {
            to: {
              type: "string",
              description: "Recipient email address",
            },
            subject: {
              type: "string",
              description: "Email subject line",
            },
            body: {
              type: "string",
              description: "Email message body",
            },
          },
          required: ["to", "subject", "body"],
        },
      },
      {
        name: "get_calendar_events",
        description: "Get calendar events for a specific date or range",
        parameters: {
          type: "object",
          properties: {
            date: {
              type: "string",
              description: "Date to get events for (YYYY-MM-DD)",
            },
            range: {
              type: "string",
              description: "Time range",
              enum: ["today", "tomorrow", "week", "month"],
            },
          },
        },
      },
      {
        name: "create_calendar_event",
        description: "Create a new calendar event",
        parameters: {
          type: "object",
          properties: {
            title: {
              type: "string",
              description: "Event title",
            },
            description: {
              type: "string",
              description: "Event description",
            },
            startTime: {
              type: "string",
              description: "Event start time (ISO datetime)",
            },
            endTime: {
              type: "string",
              description: "Event end time (ISO datetime)",
            },
            attendees: {
              type: "array",
              items: { type: "string" },
              description: "List of attendee email addresses",
            },
          },
          required: ["title", "startTime"],
        },
      },
      {
        name: "update_settings",
        description: "Update user or system settings",
        parameters: {
          type: "object",
          properties: {
            settingType: {
              type: "string",
              description: "Type of setting to update",
              enum: ["notification", "voice", "privacy", "display"],
            },
            settings: {
              type: "object",
              description: "Settings to update",
            },
          },
          required: ["settingType", "settings"],
        },
      },
    ];

    return functions;
  }

  async processCommand(
    userMessage: string,
    userId: number,
    organizationId: string,
    conversationId?: number
  ): Promise<{
    message: AIMessage;
    commandLog?: AICommandLog;
    result?: CommandResult;
    conversationId: number;
  }> {
    const startTime = Date.now();

    const breakdown = await this.breakDownMultipleRequests(userMessage);

    if (breakdown.hasMultipleTasks && breakdown.tasks.length > 1) {
      return this.processMultiTaskCommand(
        userMessage,
        breakdown.tasks,
        userId,
        organizationId,
        conversationId
      );
    }

    return this.processSingleCommand(
      userMessage,
      userId,
      organizationId,
      conversationId,
      startTime
    );
  }

  private async processMultiTaskCommand(
    originalMessage: string,
    tasks: TaskBreakdown["tasks"],
    userId: number,
    organizationId: string,
    conversationId?: number
  ): Promise<{
    message: AIMessage;
    commandLog?: AICommandLog;
    result?: CommandResult;
    conversationId: number;
  }> {
    let currentConversationId = conversationId;

    if (!currentConversationId) {
      const conversation = await storage.createAIConversation({
        userId,
        organizationId,
        title: originalMessage.substring(0, 100),
      });
      currentConversationId = conversation.id;
    }

    await storage.createAIMessage({
      conversationId: currentConversationId,
      role: "user",
      content: originalMessage,
    });

    const taskResults: string[] = [];
    const allStructuredData: any[] = [];

    for (let i = 0; i < tasks.length; i++) {
      const task = tasks[i];
      
      try {
        const result = await this.processSingleCommand(
          task.userMessage,
          userId,
          organizationId,
          currentConversationId,
          Date.now(),
          true
        );

        if (result.message.content) {
          taskResults.push(`**Task ${i + 1}: ${task.description}**\n${result.message.content}`);
        }

        if (result.message.structuredData) {
          allStructuredData.push({
            taskNumber: i + 1,
            taskDescription: task.description,
            ...result.message.structuredData,
          });
        }
      } catch (error: any) {
        console.error(`Error executing task ${i + 1}:`, error);
        taskResults.push(`**Task ${i + 1}: ${task.description}**\nI encountered an issue with this task: ${error.message}`);
      }
    }

    const combinedResponse = `I've completed all ${tasks.length} tasks:\n\n${taskResults.join("\n\n")}`;

    const assistantMessage = await storage.createAIMessage({
      conversationId: currentConversationId,
      role: "assistant",
      content: combinedResponse,
      structuredData: allStructuredData.length > 0 ? { multiTask: true, tasks: allStructuredData } : undefined,
      metadata: {
        tasksExecuted: tasks.length,
        taskBreakdown: tasks.map(t => t.description),
      },
    });

    return {
      message: assistantMessage,
      result: { success: true, data: { tasksCompleted: tasks.length } },
      conversationId: currentConversationId,
    };
  }

  private async processSingleCommand(
    userMessage: string,
    userId: number,
    organizationId: string,
    conversationId: number | undefined,
    startTime: number,
    skipUserMessage: boolean = false
  ): Promise<{
    message: AIMessage;
    commandLog?: AICommandLog;
    result?: CommandResult;
    conversationId: number;
  }> {

    try {
      let currentConversationId = conversationId;

      if (!currentConversationId) {
        const conversation = await storage.createAIConversation({
          userId,
          organizationId,
          title: userMessage.substring(0, 100),
        });
        currentConversationId = conversation.id;
      }

      const conversationHistory = await storage.getAIMessages(currentConversationId);

      const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
        {
          role: "system",
          content: `You are an intelligent AI assistant that helps users manage their calls, contacts, messages, calendar, todos, and analytics. 
          
You can perform actions on behalf of the user through function calls. When a user asks you to do something:
1. Use the appropriate function to execute the action
2. Provide a clear, friendly confirmation of what you did
3. Display relevant data in a structured format when appropriate

Be conversational, helpful, and proactive. If you're unsure about a command, ask for clarification.`,
        },
        ...conversationHistory.map((msg) => ({
          role: msg.role as "user" | "assistant" | "system",
          content: msg.content,
        })),
        {
          role: "user",
          content: userMessage,
        },
      ];

      const functions = await this.getAvailableFunctions();

      let completion;
      try {
        completion = await retryWithExponentialBackoff(() => 
          openai.chat.completions.create({
            model: "gpt-4-turbo-preview",
            messages,
            functions: functions as any,
            function_call: "auto",
            temperature: 0.7,
          })
        );
      } catch (error: any) {
        const fallbackMessage = await storage.createAIMessage({
          conversationId: currentConversationId,
          role: "assistant",
          content: "I'm having trouble connecting to my AI service right now. This could be due to high demand or a temporary issue. Please try again in a moment.",
        });
        
        console.error("OpenAI API error:", error);
        return { 
          message: fallbackMessage,
          result: { 
            success: false, 
            error: error.message || "AI service temporarily unavailable" 
          },
          conversationId: currentConversationId,
        };
      }

      const responseMessage = completion.choices[0].message;
      const executionTime = Date.now() - startTime;

      if (responseMessage.function_call) {
        const functionName = responseMessage.function_call.name;
        const functionArgs = JSON.parse(responseMessage.function_call.arguments);

        const commandType = this.getCommandType(functionName);
        const result = await this.executeFunction(
          functionName,
          functionArgs,
          userId,
          organizationId
        );

        const commandLog = await storage.createAICommandLog({
          conversationId: currentConversationId,
          userId,
          organizationId,
          command: userMessage,
          commandType,
          intent: functionName,
          parameters: functionArgs,
          functionCalled: functionName,
          status: result.success ? "success" : "failed",
          executionTime,
          errorMessage: result.error,
          result: result.data || result.error,
        });

        let secondCompletion;
        try {
          secondCompletion = await retryWithExponentialBackoff(() =>
            openai.chat.completions.create({
              model: "gpt-4-turbo-preview",
              messages: [
                ...messages,
                responseMessage,
                {
                  role: "function",
                  name: functionName,
                  content: JSON.stringify(result.data || result.error),
                },
              ],
              temperature: 0.7,
            })
          );
        } catch (error: any) {
          console.error("OpenAI API error on second completion:", error);
          
          const fallbackContent = result.success 
            ? `I successfully executed your command, but had trouble generating a response. Here's what I found: ${JSON.stringify(result.data)}`
            : `I encountered an issue: ${result.error}`;
          
          const assistantMessage = await storage.createAIMessage({
            conversationId: currentConversationId,
            role: "assistant",
            content: fallbackContent,
          });
          
          return {
            message: assistantMessage,
            commandLog,
            result,
            conversationId: currentConversationId,
          };
        }

        const finalResponse = secondCompletion.choices[0].message.content || "Action completed.";

        if (!skipUserMessage) {
          await storage.createAIMessage({
            conversationId: currentConversationId,
            role: "user",
            content: userMessage,
          });
        }

        const assistantMessage = await storage.createAIMessage({
          conversationId: currentConversationId,
          role: "assistant",
          content: finalResponse,
          commandExecuted: functionName,
          executionResult: result.data,
          structuredData: result.structuredData,
          metadata: {
            executionTime,
            tokensUsed: completion.usage?.total_tokens,
          },
        });

        return {
          message: assistantMessage,
          commandLog,
          result,
          conversationId: currentConversationId,
        };
      } else {
        const responseContent = responseMessage.content || "I'm here to help!";

        if (!skipUserMessage) {
          await storage.createAIMessage({
            conversationId: currentConversationId,
            role: "user",
            content: userMessage,
          });
        }

        const assistantMessage = await storage.createAIMessage({
          conversationId: currentConversationId,
          role: "assistant",
          content: responseContent,
          metadata: {
            executionTime,
            tokensUsed: completion.usage?.total_tokens,
          },
        });

        return {
          message: assistantMessage,
          conversationId: currentConversationId,
        };
      }
    } catch (error: any) {
      console.error("Error processing AI command:", error);
      throw error;
    }
  }

  private getCommandType(functionName: string): string {
    const typeMap: Record<string, string> = {
      search_calls: "call",
      get_contacts: "contact",
      create_contact: "contact",
      send_sms: "sms",
      get_sms_messages: "sms",
      create_todo: "todo",
      get_todos: "todo",
      complete_todo: "todo",
      create_reminder: "reminder",
      get_analytics: "analytics",
      send_email: "email",
      get_calendar_events: "calendar",
      create_calendar_event: "calendar",
      update_settings: "settings",
    };
    return typeMap[functionName] || "general";
  }

  private async executeFunction(
    functionName: string,
    args: Record<string, any>,
    userId: number,
    organizationId: string
  ): Promise<CommandResult> {
    try {
      switch (functionName) {
        case "search_calls":
          return await this.searchCalls(args as any, organizationId);
        
        case "get_contacts":
          return await this.getContacts(args as any, organizationId);
        
        case "create_contact":
          return await this.createContact(args as any, userId, organizationId);
        
        case "send_sms":
          return await this.sendSMS(args as any, organizationId);
        
        case "get_sms_messages":
          return await this.getSMSMessages(args as any, organizationId);
        
        case "create_todo":
          return await this.createTodo(args as any, userId, organizationId);
        
        case "get_todos":
          return await this.getTodos(args as any, userId, organizationId);
        
        case "complete_todo":
          return await this.completeTodo(args as any);
        
        case "create_reminder":
          return await this.createReminder(args as any, userId, organizationId);
        
        case "get_analytics":
          return await this.getAnalytics(args as any, organizationId);
        
        case "send_email":
          return await this.sendEmail(args as any, organizationId);
        
        case "get_calendar_events":
          return await this.getCalendarEvents(args as any, organizationId);
        
        case "create_calendar_event":
          return await this.createCalendarEvent(args as any, userId, organizationId);
        
        case "update_settings":
          return await this.updateSettings(args as any, userId, organizationId);
        
        default:
          return {
            success: false,
            error: `Unknown function: ${functionName}`,
          };
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Failed to execute command",
      };
    }
  }

  private async searchCalls(
    args: { limit?: number; status?: string; direction?: string },
    organizationId: string
  ): Promise<CommandResult> {
    const calls = await storage.getCalls(organizationId);
    let filtered = calls;

    if (args.status) {
      filtered = filtered.filter((call) => call.status === args.status);
    }
    if (args.direction) {
      filtered = filtered.filter((call) => call.direction === args.direction);
    }

    const limited = args.limit ? filtered.slice(0, args.limit) : filtered.slice(0, 10);

    return {
      success: true,
      data: limited,
      structuredData: {
        type: "table",
        columns: ["Caller", "Status", "Duration", "Time"],
        rows: limited.map((call) => [
          call.callerName || call.from,
          call.status,
          call.duration ? `${Math.floor(call.duration / 60)}m ${call.duration % 60}s` : "N/A",
          call.startTime?.toLocaleString() || "N/A",
        ]),
      },
    };
  }

  private async getContacts(
    args: { search?: string },
    organizationId: string
  ): Promise<CommandResult> {
    const contacts = await storage.getContacts(organizationId);
    let filtered = contacts;

    if (args.search) {
      const searchLower = args.search.toLowerCase();
      filtered = contacts.filter(
        (c) =>
          c.firstName?.toLowerCase().includes(searchLower) ||
          c.lastName?.toLowerCase().includes(searchLower) ||
          c.email?.toLowerCase().includes(searchLower) ||
          c.company?.toLowerCase().includes(searchLower)
      );
    }

    return {
      success: true,
      data: filtered.slice(0, 20),
      structuredData: {
        type: "list",
        items: filtered.slice(0, 20).map((c) => ({
          id: c.id,
          title: `${c.firstName || ""} ${c.lastName || ""}`.trim() || c.displayName || "Unknown",
          subtitle: c.company || c.email || "",
          metadata: {
            email: c.email,
            phone: c.phoneNumbers?.[0],
            isVip: c.isVip,
          },
        })),
      },
    };
  }

  private async createContact(
    args: { firstName: string; lastName?: string; email?: string; phoneNumber?: string; company?: string },
    userId: number,
    organizationId: string
  ): Promise<CommandResult> {
    const contact = await storage.createContact({
      firstName: args.firstName,
      lastName: args.lastName || "",
      email: args.email,
      company: args.company,
      organizationId,
      internalId: `CONT-${Date.now()}`,
    });

    if (args.phoneNumber && contact.id) {
      await storage.addContactPhoneNumber({
        contactId: contact.id,
        phoneNumber: args.phoneNumber,
        type: "mobile",
        isPrimary: true,
      });
    }

    return {
      success: true,
      data: contact,
    };
  }

  private async sendSMS(
    args: { to: string; message: string },
    organizationId: string
  ): Promise<CommandResult> {
    return {
      success: false,
      error: "SMS sending requires Twilio integration to be configured",
    };
  }

  private async getSMSMessages(
    args: { phoneNumber?: string; limit?: number },
    organizationId: string
  ): Promise<CommandResult> {
    let messages;
    if (args.phoneNumber) {
      messages = await storage.getSMSMessagesByPhone(args.phoneNumber, organizationId);
    } else {
      messages = await storage.getSMSMessages(organizationId);
    }

    const limited = args.limit ? messages.slice(0, args.limit) : messages.slice(0, 20);

    return {
      success: true,
      data: limited,
    };
  }

  private async createTodo(
    args: {
      title: string;
      note?: string;
      dueDate?: string;
      reminderDate?: string;
      priority?: string;
      categoryId?: number;
    },
    userId: number,
    organizationId: string
  ): Promise<CommandResult> {
    const todo = await storage.createTodo({
      title: args.title,
      note: args.note,
      dueDate: args.dueDate ? new Date(args.dueDate) : undefined,
      reminderDate: args.reminderDate ? new Date(args.reminderDate) : undefined,
      reminderEnabled: !!args.reminderDate,
      priority: (args.priority as any) || "none",
      categoryId: args.categoryId,
      userId,
      organizationId,
    });

    return {
      success: true,
      data: todo,
    };
  }

  private async getTodos(
    args: { categoryId?: number; completed?: boolean },
    userId: number,
    organizationId: string
  ): Promise<CommandResult> {
    const todos = await storage.getTodos(userId, organizationId, args.categoryId);
    
    let filtered = todos;
    if (args.completed !== undefined) {
      filtered = todos.filter((t) => t.completed === args.completed);
    }

    return {
      success: true,
      data: filtered,
      structuredData: {
        type: "checklist",
        items: filtered.map((t) => ({
          id: t.id,
          title: t.title,
          completed: t.completed,
          priority: t.priority,
          dueDate: t.dueDate,
        })),
      },
    };
  }

  private async completeTodo(args: { todoId: number }): Promise<CommandResult> {
    await storage.updateTodo(args.todoId, {
      completed: true,
    });

    return {
      success: true,
      data: { todoId: args.todoId, completed: true },
    };
  }

  private async createReminder(
    args: {
      title: string;
      description?: string;
      reminderTime: string;
      priority?: string;
      channels?: string[];
    },
    userId: number,
    organizationId: string
  ): Promise<CommandResult> {
    const reminder = await storage.createAIReminder({
      userId,
      organizationId,
      title: args.title,
      description: args.description,
      reminderType: "one_time",
      reminderTime: new Date(args.reminderTime),
      priority: (args.priority as any) || "medium",
      channels: (args.channels as any) || ["browser"],
    });

    return {
      success: true,
      data: reminder,
    };
  }

  private async getAnalytics(
    args: { metric: string; period?: string },
    organizationId: string
  ): Promise<CommandResult> {
    switch (args.metric) {
      case "calls":
        const calls = await storage.getCalls(organizationId);
        return {
          success: true,
          data: {
            total: calls.length,
            completed: calls.filter((c) => c.status === "completed").length,
            inbound: calls.filter((c) => c.direction === "inbound").length,
            outbound: calls.filter((c) => c.direction === "outbound").length,
          },
          structuredData: {
            type: "stats",
            stats: [
              { label: "Total Calls", value: calls.length },
              { label: "Completed", value: calls.filter((c) => c.status === "completed").length },
              { label: "Inbound", value: calls.filter((c) => c.direction === "inbound").length },
              { label: "Outbound", value: calls.filter((c) => c.direction === "outbound").length },
            ],
          },
        };
      
      case "contacts":
        const contacts = await storage.getContacts(organizationId);
        return {
          success: true,
          data: {
            total: contacts.length,
            vip: contacts.filter((c) => c.isVip).length,
            favorites: contacts.filter((c) => c.isFavorite).length,
          },
          structuredData: {
            type: "stats",
            stats: [
              { label: "Total Contacts", value: contacts.length },
              { label: "VIP", value: contacts.filter((c) => c.isVip).length },
              { label: "Favorites", value: contacts.filter((c) => c.isFavorite).length },
            ],
          },
        };
      
      case "todos":
        const todos = await storage.getTodos(1, organizationId);
        const completed = todos.filter((t) => t.completed);
        const pending = todos.filter((t) => !t.completed);
        const highPriority = todos.filter((t) => t.priority === "high" && !t.completed);
        return {
          success: true,
          data: {
            total: todos.length,
            completed: completed.length,
            pending: pending.length,
            highPriority: highPriority.length,
          },
          structuredData: {
            type: "stats",
            stats: [
              { label: "Total Todos", value: todos.length },
              { label: "Completed", value: completed.length },
              { label: "Pending", value: pending.length },
              { label: "High Priority", value: highPriority.length },
            ],
          },
        };
      
      case "messages":
        const messages = await storage.getSMSMessages(organizationId);
        const inbound = messages.filter((m) => m.direction === "inbound");
        const outbound = messages.filter((m) => m.direction === "outbound");
        const delivered = messages.filter((m) => m.status === "delivered");
        return {
          success: true,
          data: {
            total: messages.length,
            inbound: inbound.length,
            outbound: outbound.length,
            delivered: delivered.length,
          },
          structuredData: {
            type: "stats",
            stats: [
              { label: "Total Messages", value: messages.length },
              { label: "Inbound", value: inbound.length },
              { label: "Outbound", value: outbound.length },
              { label: "Delivered", value: delivered.length },
            ],
          },
        };
      
      default:
        return {
          success: false,
          error: `Analytics for ${args.metric} not yet implemented`,
        };
    }
  }

  private async sendEmail(
    args: { to: string; subject: string; body: string },
    organizationId: string
  ): Promise<CommandResult> {
    return {
      success: false,
      error: "Email sending requires email service configuration (SendGrid or similar)",
    };
  }

  private async getCalendarEvents(
    args: { date?: string; range?: string },
    organizationId: string
  ): Promise<CommandResult> {
    return {
      success: true,
      data: [],
      structuredData: {
        type: "calendar",
        events: [],
        message: "Calendar integration coming soon",
      },
    };
  }

  private async createCalendarEvent(
    args: {
      title: string;
      description?: string;
      startTime: string;
      endTime?: string;
      attendees?: string[];
    },
    userId: number,
    organizationId: string
  ): Promise<CommandResult> {
    return {
      success: false,
      error: "Calendar event creation requires calendar service integration",
    };
  }

  private async updateSettings(
    args: { settingType: string; settings: Record<string, any> },
    userId: number,
    organizationId: string
  ): Promise<CommandResult> {
    if (args.settingType === "voice" || args.settingType === "notification" || args.settingType === "privacy") {
      await storage.updateAIUserPreferences(userId, organizationId, args.settings as any);
      return {
        success: true,
        data: { updated: true, settingType: args.settingType },
      };
    }

    return {
      success: false,
      error: `Unknown setting type: ${args.settingType}`,
    };
  }

  async getUserPreferences(
    userId: number,
    organizationId: string
  ): Promise<AIUserPreferences | null> {
    return await storage.getAIUserPreferences(userId, organizationId);
  }

  async updateUserPreferences(
    userId: number,
    organizationId: string,
    preferences: Partial<AIUserPreferences>
  ): Promise<AIUserPreferences> {
    return await storage.updateAIUserPreferences(userId, organizationId, preferences as any);
  }

  async getConversationHistory(conversationId: number): Promise<AIMessage[]> {
    return await storage.getAIMessages(conversationId);
  }

  async getUserConversations(userId: number, organizationId: string): Promise<AIConversation[]> {
    return await storage.getAIConversations(userId, organizationId);
  }
}

export const aiAssistantService = new AIAssistantService();
