// Rewrites a template expression's free identifiers for one front: a prop is
// `view()` in Angular (a signal) and `view` elsewhere; `$slots` is the front's
// slot record. Loop variables are left alone.
import { parseExpression } from '@babel/parser';

const GLOBALS = new Set(['undefined', 'null', 'true', 'false', 'Math', 'String', 'Number', 'Boolean', 'Array', 'Object', 'JSON']);

function freeIdentifiers(ast) {
  const found = [];
  const visit = (node, parent, key) => {
    if (!node || typeof node.type !== 'string') return;
    if (node.type === 'Identifier') {
      const isMemberProperty = parent?.type === 'MemberExpression' || parent?.type === 'OptionalMemberExpression';
      if (isMemberProperty && key === 'property' && !parent.computed) return;
      if (parent?.type === 'ObjectProperty' && key === 'key' && !parent.computed) return;
      found.push(node);
      return;
    }
    if (node.type === 'ArrowFunctionExpression' || node.type === 'FunctionExpression') {
      throw new Error('functions are not allowed in template expressions (Angular cannot express them)');
    }
    for (const [childKey, value] of Object.entries(node)) {
      if (childKey === 'loc' || childKey === 'start' || childKey === 'end') continue;
      if (Array.isArray(value)) value.forEach((v) => visit(v, node, childKey));
      else if (value && typeof value === 'object') visit(value, node, childKey);
    }
  };
  visit(ast, null, null);
  return found;
}

/**
 * @param {string} expr      the expression as authored
 * @param {Set<string>} locals loop variables in scope
 * @param {Set<string>} props  declared prop names
 * @param {(name: string) => string} prop  how this front reads a prop
 * @param {string} slots     how this front reads the slot record
 */
export function rewrite(expr, { locals, props, prop, slots }) {
  const source = expr.trim();
  const ast = parseExpression(source, { plugins: ['typescript'] });
  const edits = freeIdentifiers(ast)
    .filter((id) => !locals.has(id.name) && !GLOBALS.has(id.name))
    .map((id) => {
      if (id.name === '$slots') return { start: id.start, end: id.end, text: slots };
      if (!props.has(id.name)) throw new Error(`"${id.name}" is neither a prop nor a loop variable`);
      return { start: id.start, end: id.end, text: prop(id.name) };
    })
    .sort((a, b) => b.start - a.start);
  return edits.reduce((text, edit) => text.slice(0, edit.start) + edit.text + text.slice(edit.end), source);
}
