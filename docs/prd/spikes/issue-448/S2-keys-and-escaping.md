# S2 — Keys and escaping (D3)

- **Keys:** the transfer key is `mp-dt:${stateKey}:${hashKey(requestKey)}`, and `requestKey` is the
  canonical `{s,pp,p,f,q}` (sorted keys, inactive filters dropped, `fetchParams` validated). Nothing
  in it depends on render order or a generated id, so a client-only component above the table cannot
  shift it — the `BsIdService` failure mode the spike was meant to expose does not exist by
  construction. Pinned in `datatable.spec.ts` ("keys the request canonically").
- **A seed for another query is ignored**, never shown: `state(inputs, seed)` compares `seed.key` with
  the client's own request key and renders loading on a mismatch (spec "ignores a seed for another
  query").
- **Escaping:** `serializeTransferState` escapes `<`, `>`, `&`, U+2028 and U+2029, the same set as
  Angular's `TransferState`. A row containing `</script><!-- &   ` round-trips through
  `readTransferState` (spec in `transfer-state.spec.ts`). The first version had the two separators as
  literal characters inside a regex, which TypeScript rejects (TS1161); they are written as ` `.
- **Non-JSON** `fetchParams` (a `Date`, a function, a class instance, a cycle) throws
  `NonJsonValueError` naming the path (`fetchParams.since is a Date (send an ISO string)`), on both
  sides, before any request.
