export class MaxDepthExceededError extends Error {
  override readonly name = 'MaxDepthExceededError';
  constructor(public readonly depth: number, public readonly maxDepth: number) {
    super(`Query tree depth ${depth} exceeds maxDepth ${maxDepth}.`);
  }
}
