<!-- Do not edit this file. It is automatically generated by API Documenter. -->

[Home](./index.md) &gt; [daf-core](./daf-core.md) &gt; [AbstractIdentityProvider](./daf-core.abstractidentityprovider.md) &gt; [removeKey](./daf-core.abstractidentityprovider.removekey.md)

## AbstractIdentityProvider.removeKey() method

<b>Signature:</b>

```typescript
abstract removeKey(args: {
        identity: IIdentity;
        kid: string;
        options?: any;
    }, context: IAgentContext<IKeyManager>): Promise<any>;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  args | { identity: [IIdentity](./daf-core.iidentity.md)<!-- -->; kid: string; options?: any; } |  |
|  context | [IAgentContext](./daf-core.iagentcontext.md)<!-- -->&lt;[IKeyManager](./daf-core.ikeymanager.md)<!-- -->&gt; |  |

<b>Returns:</b>

Promise&lt;any&gt;
