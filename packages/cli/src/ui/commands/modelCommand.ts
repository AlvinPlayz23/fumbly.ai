/**
 * @license
 * Copyright 2025 Fumbly AI
 * SPDX-License-Identifier: Apache-2.0
 */

import { SlashCommand, CommandContext, MessageActionReturn } from './types.js';
import { DEFAULT_GEMINI_MODEL, DEFAULT_GEMINI_FLASH_MODEL } from 'fumbly-cli-core';
import { MessageType } from '../types.js';

// Available models with their display names and descriptions
const AVAILABLE_MODELS = [
  {
    id: 'gemini-2.5-pro',
    name: 'Gemini 2.5 Pro',
    description: 'Most capable model with advanced reasoning',
    isDefault: true,
  },
  {
    id: 'gemini-2.5-flash',
    name: 'Gemini 2.5 Flash',
    description: 'Faster model optimized for speed',
    isDefault: false,
  },
  {
    id: 'gemini-1.5-pro-latest',
    name: 'Gemini 1.5 Pro Latest',
    description: 'Latest version of Gemini 1.5 Pro',
    isDefault: false,
  },
  {
    id: 'gemini-1.5-flash-latest',
    name: 'Gemini 1.5 Flash Latest',
    description: 'Latest version of Gemini 1.5 Flash',
    isDefault: false,
  },
];

const listModels = (context: CommandContext): void => {
  const currentModel = context.services.config?.getModel() || 'unknown';

  let message = 'Available models:\n\n';

  for (const model of AVAILABLE_MODELS) {
    const isCurrent = model.id === currentModel;
    const marker = isCurrent ? '→ ' : '  ';
    const defaultMarker = model.isDefault ? ' (default)' : '';

    message += `${marker}${model.name} (${model.id})${defaultMarker}\n    ${model.description}\n\n`;
  }

  message += `Current model: ${currentModel}\n`;
  message += 'Use `/model set <model-id>` to switch models\n';
  message += 'Use `/model reset` to return to default model';

  context.ui.addItem(
    {
      type: MessageType.INFO,
      text: message,
    },
    Date.now(),
  );
};

const setModel = (context: CommandContext, modelId: string): MessageActionReturn | void => {
  if (!modelId.trim()) {
    return {
      type: 'message',
      messageType: 'error',
      content: 'Please specify a model ID. Use `/model list` to see available models.',
    };
  }

  const model = AVAILABLE_MODELS.find(m => m.id === modelId.trim());
  if (!model) {
    return {
      type: 'message',
      messageType: 'error',
      content: `Unknown model "${modelId}". Use \`/model list\` to see available models.`,
    };
  }

  if (!context.services.config) {
    return {
      type: 'message',
      messageType: 'error',
      content: 'Configuration not available.',
    };
  }

  const previousModel = context.services.config.getModel();
  context.services.config.setModel(model.id);

  context.ui.addItem(
    {
      type: MessageType.INFO,
      text: `Model switched from ${previousModel} to ${model.name} (${model.id})\n${model.description}`,
    },
    Date.now(),
  );
};

const resetModel = (context: CommandContext): MessageActionReturn | void => {
  if (!context.services.config) {
    return {
      type: 'message',
      messageType: 'error',
      content: 'Configuration not available.',
    };
  }

  const previousModel = context.services.config.getModel();
  context.services.config.resetModelToDefault();
  const newModel = context.services.config.getModel();

  const message = previousModel === newModel
    ? `Already using default model: ${newModel}`
    : `Model reset from ${previousModel} to default: ${newModel}`;

  context.ui.addItem(
    {
      type: MessageType.INFO,
      text: message,
    },
    Date.now(),
  );
};

const showCurrentModel = (context: CommandContext): MessageActionReturn | void => {
  if (!context.services.config) {
    return {
      type: 'message',
      messageType: 'error',
      content: 'Configuration not available.',
    };
  }

  const currentModel = context.services.config.getModel();
  const model = AVAILABLE_MODELS.find(m => m.id === currentModel);
  const modelName = model ? model.name : 'Unknown';
  const isDefault = !context.services.config.isModelSwitchedDuringSession();

  let message = `Current model: ${modelName} (${currentModel})\n`;
  if (model) {
    message += `Description: ${model.description}\n`;
  }
  message += `Status: ${isDefault ? 'Default' : 'Switched during session'}`;

  context.ui.addItem(
    {
      type: MessageType.INFO,
      text: message,
    },
    Date.now(),
  );
};

export const modelCommand: SlashCommand = {
  name: 'model',
  description: 'Manage AI model selection',
  action: (context: CommandContext, args: string) => {
    if (!args.trim()) {
      showCurrentModel(context);
      return;
    }

    return {
      type: 'message',
      messageType: 'info',
      content: 'Use `/model list`, `/model set <model-id>`, or `/model reset`',
    };
  },
  completion: async (_context: CommandContext, partialArg: string) => {
    const subCommands = ['list', 'set', 'reset'];
    return subCommands.filter(cmd => cmd.startsWith(partialArg.toLowerCase()));
  },
  subCommands: [
    {
      name: 'list',
      description: 'List all available models',
      action: listModels,
    },
    {
      name: 'set',
      description: 'Set the current model',
      action: (context: CommandContext, args: string) => {
        setModel(context, args);
      },
      completion: async (_context: CommandContext, partialArg: string) => {
        return AVAILABLE_MODELS
          .map(m => m.id)
          .filter(id => id.startsWith(partialArg.toLowerCase()));
      },
    },
    {
      name: 'reset',
      description: 'Reset to default model',
      action: resetModel,
    },
  ],
};
