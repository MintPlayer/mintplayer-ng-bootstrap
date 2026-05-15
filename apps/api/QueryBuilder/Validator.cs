using System.Text.Json;
using System.Text.RegularExpressions;

namespace MintPlayer.NgBootstrap.Api.QueryBuilder;

/// <summary>
/// Implements the PRD Appendix D validation checklist before the walker
/// runs. Throws QueryBuilderException(code) on the first violation.
/// </summary>
public static class Validator
{
    public const int MaxDepth = 32;
    public const int MaxNodeCount = 1024;
    public const int MaxStringLength = 1024;
    public const int MaxArrayLength = 256;

    // UUID v4 syntax check (PRD Appendix D rule #4). The "4" pins the version
    // nibble; the [89ab] pins the variant nibble. Case-insensitive.
    private static readonly Regex UuidV4Regex = new(
        "^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$",
        RegexOptions.IgnoreCase | RegexOptions.Compiled);

    public static void Validate(ExpressionNode tree, EntitySchemaDto rootEntity, List<EntitySchemaDto> schema)
    {
        var ids = new HashSet<string>();
        int count = 0;
        Walk(tree, rootEntity, schema, depth: 0, ids, ref count);
    }

    private static void Walk(
        ExpressionNode node,
        EntitySchemaDto entity,
        List<EntitySchemaDto> schema,
        int depth,
        HashSet<string> ids,
        ref int count)
    {
        if (depth > MaxDepth) throw new QueryBuilderException("TREE_TOO_DEEP");
        count++;
        if (count > MaxNodeCount) throw new QueryBuilderException("TREE_TOO_LARGE");

        if (string.IsNullOrEmpty(node.Id) || !UuidV4Regex.IsMatch(node.Id))
            throw new QueryBuilderException("INVALID_NODE_ID", node.Id);
        if (!ids.Add(node.Id)) throw new QueryBuilderException("DUPLICATE_NODE_ID", node.Id);

        switch (node)
        {
            case GroupNode g:
                if (g.Logic is not ("and" or "or"))
                    throw new QueryBuilderException("INVALID_LOGIC", g.Logic);
                foreach (var child in g.Children)
                {
                    Walk(child, entity, schema, depth + 1, ids, ref count);
                }
                break;
            case ConditionNode c:
                ValidateCondition(c, entity);
                break;
            case SubQueryNode sq:
                if (sq.Operator is not ("in" or "not-in"))
                    throw new QueryBuilderException("INVALID_SUBQUERY_OPERATOR", sq.Operator);
                var fieldDef = entity.Fields.FirstOrDefault(f => f.Name == sq.Field)
                    ?? throw new QueryBuilderException("UNKNOWN_FIELD", $"{entity.Name}.{sq.Field}");
                if (fieldDef.Type != "relation" || string.IsNullOrEmpty(fieldDef.TargetEntity))
                    throw new QueryBuilderException("SUBQUERY_FIELD_NOT_RELATION", sq.Field);
                var targetEntity = schema.FirstOrDefault(e => e.Name == fieldDef.TargetEntity)
                    ?? throw new QueryBuilderException("SUBQUERY_RELATION_NOT_CONFIGURED", fieldDef.TargetEntity);
                if (sq.SubQuery is null) throw new QueryBuilderException("SUBQUERY_BODY_NOT_GROUP");
                Walk(sq.SubQuery, targetEntity, schema, depth + 1, ids, ref count);
                break;
            default:
                throw new QueryBuilderException("UNKNOWN_KIND", node.GetType().Name);
        }
    }

    private static void ValidateCondition(ConditionNode c, EntitySchemaDto entity)
    {
        var fieldDef = entity.Fields.FirstOrDefault(f => f.Name == c.Field)
            ?? throw new QueryBuilderException("UNKNOWN_FIELD", $"{entity.Name}.{c.Field}");

        if (fieldDef.Type == "relation")
            throw new QueryBuilderException("FIELD_IS_RELATION", c.Field);

        if (!OperatorCatalog.IsValidFor(fieldDef.Type, c.Operator))
            throw new QueryBuilderException("INVALID_OPERATOR_FOR_TYPE", $"{c.Field}/{c.Operator}");

        ValidateValueShape(c.Operator, c.Value, fieldDef);
    }

    private static void ValidateValueShape(string op, object? value, FieldDefDto field)
    {
        var shape = OperatorCatalog.ValueShape(op);
        switch (shape)
        {
            case "null":
                if (value is not null and not JsonElement { ValueKind: JsonValueKind.Null })
                    throw new QueryBuilderException("INVALID_VALUE_SHAPE", $"{op} requires null");
                break;
            case "tuple":
                if (value is JsonElement je && je.ValueKind == JsonValueKind.Array)
                {
                    if (je.GetArrayLength() != 2)
                        throw new QueryBuilderException("INVALID_VALUE_SHAPE", $"{op} requires [v1, v2]");
                }
                else
                {
                    throw new QueryBuilderException("INVALID_VALUE_SHAPE", $"{op} requires array");
                }
                break;
            case "array":
                if (value is JsonElement aje && aje.ValueKind == JsonValueKind.Array)
                {
                    if (aje.GetArrayLength() > MaxArrayLength)
                        throw new QueryBuilderException("VALUE_TOO_LARGE", $"array length > {MaxArrayLength}");
                }
                else
                {
                    throw new QueryBuilderException("INVALID_VALUE_SHAPE", $"{op} requires array");
                }
                break;
            case "n-input":
                if (value is JsonElement nje && nje.ValueKind == JsonValueKind.Object)
                {
                    if (!nje.TryGetProperty("n", out var nProp) || nProp.ValueKind != JsonValueKind.Number)
                        throw new QueryBuilderException("INVALID_VALUE_SHAPE", $"{op} requires {{ n: number }}");
                    var n = nProp.GetInt32();
                    if (n < 1) throw new QueryBuilderException("INVALID_VALUE_SHAPE", $"{op} n must be >= 1");
                }
                else
                {
                    throw new QueryBuilderException("INVALID_VALUE_SHAPE", $"{op} requires {{ n: number }}");
                }
                break;
            case "scalar":
                // Null is never a valid scalar value (the parameterless shape is
                // "null"; that path is taken by is-null/is-true/today/etc.). Without
                // this guard, walker-side Expression.Constant on a non-nullable
                // value type crashes, and string ops like `contains` silently
                // degrade to `field.Contains("")` which is always true.
                if (value is null || (value is JsonElement nullJe && nullJe.ValueKind == JsonValueKind.Null))
                    throw new QueryBuilderException("INVALID_VALUE_SHAPE", $"{op} requires a value");
                // Per-type bounds.
                if (value is JsonElement sje)
                {
                    if (field.Type == "string" && sje.ValueKind == JsonValueKind.String && (sje.GetString()?.Length ?? 0) > MaxStringLength)
                        throw new QueryBuilderException("VALUE_TOO_LARGE", $"string > {MaxStringLength}");
                }
                break;
        }
    }
}
