import { createContext } from '@lit/context';
import type { EditorRegistry } from './model/editor';
import type { QueryBuilderMessages } from './model/messages';
export const editorRegistryContext = createContext<EditorRegistry | undefined>(
  Symbol('mp-query-builder.editorRegistry'),
);

export const disabledContext = createContext<boolean | undefined>(
  Symbol('mp-query-builder.disabled'),
);

export const messagesContext = createContext<Partial<QueryBuilderMessages> | undefined>(
  Symbol('mp-query-builder.messages'),
);

export const maxDepthContext = createContext<number | undefined>(
  Symbol('mp-query-builder.maxDepth'),
);
