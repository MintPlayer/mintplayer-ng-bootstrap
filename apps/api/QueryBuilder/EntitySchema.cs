namespace MintPlayer.NgBootstrap.Api.QueryBuilder;

public class EntitySchemaDto
{
    public string Name { get; set; } = string.Empty;
    public string Label { get; set; } = string.Empty;
    public List<FieldDefDto> Fields { get; set; } = new();
}

public class FieldDefDto
{
    public string Name { get; set; } = string.Empty;
    public string Label { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public List<FieldOptionDto>? Options { get; set; }
    public string? TargetEntity { get; set; }
}

public class FieldOptionDto
{
    public object Value { get; set; } = string.Empty;
    public string Label { get; set; } = string.Empty;
}

public static class EntitySchemaService
{
    private static readonly EntitySchemaDto OrdersSchema = new()
    {
        Name = "orders",
        Label = "Orders",
        Fields =
        [
            new FieldDefDto { Name = "total", Label = "Total", Type = "number" },
            new FieldDefDto { Name = "status", Label = "Status", Type = "enum", Options =
            [
                new() { Value = "open", Label = "Open" },
                new() { Value = "paid", Label = "Paid" },
                new() { Value = "shipped", Label = "Shipped" },
                new() { Value = "cancelled", Label = "Cancelled" },
            ] },
            new FieldDefDto { Name = "orderDate", Label = "Order date", Type = "date" },
            new FieldDefDto { Name = "tags", Label = "Tags", Type = "array", Options =
            [
                new() { Value = "urgent", Label = "Urgent" },
                new() { Value = "blocked", Label = "Blocked" },
                new() { Value = "vip", Label = "VIP" },
                new() { Value = "low-priority", Label = "Low priority" },
            ] },
            new FieldDefDto { Name = "customerId", Label = "Customer", Type = "integer" },
            new FieldDefDto { Name = "lineItems", Label = "Line items", Type = "relation", TargetEntity = "lineItems" },
        ],
    };

    private static readonly EntitySchemaDto CustomersSchema = new()
    {
        Name = "customers",
        Label = "Customers",
        Fields =
        [
            new FieldDefDto { Name = "name", Label = "Name", Type = "string" },
            new FieldDefDto { Name = "country", Label = "Country", Type = "enum", Options =
            [
                new() { Value = "BE", Label = "Belgium" },
                new() { Value = "NL", Label = "Netherlands" },
                new() { Value = "FR", Label = "France" },
                new() { Value = "DE", Label = "Germany" },
                new() { Value = "IT", Label = "Italy" },
            ] },
            new FieldDefDto { Name = "email", Label = "Email", Type = "string" },
            new FieldDefDto { Name = "createdAt", Label = "Created at", Type = "datetime" },
            new FieldDefDto { Name = "orders", Label = "Orders", Type = "relation", TargetEntity = "orders" },
        ],
    };

    private static readonly EntitySchemaDto LineItemsSchema = new()
    {
        Name = "lineItems",
        Label = "Line items",
        Fields =
        [
            new FieldDefDto { Name = "productName", Label = "Product", Type = "string" },
            new FieldDefDto { Name = "unitPrice", Label = "Unit price", Type = "number" },
            new FieldDefDto { Name = "quantity", Label = "Quantity", Type = "integer" },
        ],
    };

    public static List<EntitySchemaDto> AllForOrders() =>
        [OrdersSchema, CustomersSchema, LineItemsSchema];

    public static List<EntitySchemaDto> AllForCustomers() =>
        [CustomersSchema, OrdersSchema, LineItemsSchema];

    public static EntitySchemaDto? Get(string name) => name switch
    {
        "orders" => OrdersSchema,
        "customers" => CustomersSchema,
        "lineItems" => LineItemsSchema,
        _ => null,
    };
}
