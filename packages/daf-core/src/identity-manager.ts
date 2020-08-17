import { AbstractIdentityProvider } from './abstract/abstract-identity-provider'
import { IAgentPlugin, IIdentity, IService, IKey, IPluginMethodMap, IAgentContext } from './types'
import { AbstractIdentityStore } from './abstract/abstract-identity-store'
import { IKeyManager } from './key-manager'

export interface IIdentityManagerGetIdentityArgs {
  did: string
}
export interface IIdentityManagerDeleteIdentityArgs {
  did: string
}
export interface IIdentityManagerCreateIdentityArgs {
  alias?: string
  provider?: string
  kms?: string
  options?: any
}

export interface IIdentityManagerGetOrCreateIdentityArgs {
  alias: string
  provider?: string
  kms?: string
  options?: any
}
export interface IIdentityManagerAddKeyArgs {
  did: string
  key: IKey
  options?: any
}
export interface IIdentityManagerRemoveKeyArgs {
  did: string
  kid: string
  options?: any
}
export interface IIdentityManagerAddServiceArgs {
  did: string
  service: IService
  options?: any
}
export interface IIdentityManagerRemoveServiceArgs {
  did: string
  id: string
  options?: any
}

export interface IIdentityManager extends IPluginMethodMap {
  identityManagerGetProviders(): Promise<Array<string>>
  identityManagerGetIdentities(): Promise<Array<IIdentity>>
  identityManagerGetIdentity(args: IIdentityManagerGetIdentityArgs): Promise<IIdentity>
  identityManagerCreateIdentity(
    args: IIdentityManagerCreateIdentityArgs,
    context: IAgentContext<IKeyManager>,
  ): Promise<IIdentity>
  identityManagerGetOrCreateIdentity(
    args: IIdentityManagerGetOrCreateIdentityArgs,
    context: IAgentContext<IKeyManager>,
  ): Promise<IIdentity>
  identityManagerImportIdentity(args: IIdentity): Promise<IIdentity>
  identityManagerDeleteIdentity(
    args: IIdentityManagerDeleteIdentityArgs,
    context: IAgentContext<IKeyManager>,
  ): Promise<boolean>
  identityManagerAddKey(args: IIdentityManagerAddKeyArgs, context: IAgentContext<IKeyManager>): Promise<any> // txHash?
  identityManagerRemoveKey(
    args: IIdentityManagerRemoveKeyArgs,
    context: IAgentContext<IKeyManager>,
  ): Promise<any> // txHash?
  identityManagerAddService(
    args: IIdentityManagerAddServiceArgs,
    context: IAgentContext<IKeyManager>,
  ): Promise<any> //txHash?
  identityManagerRemoveService(
    args: IIdentityManagerRemoveServiceArgs,
    context: IAgentContext<IKeyManager>,
  ): Promise<any> //txHash?
}

export class IdentityManager implements IAgentPlugin {
  readonly methods: IIdentityManager
  private providers: Record<string, AbstractIdentityProvider>
  private defaultProvider: string
  private store: AbstractIdentityStore

  constructor(options: {
    providers: Record<string, AbstractIdentityProvider>
    defaultProvider: string
    store: AbstractIdentityStore
  }) {
    this.providers = options.providers
    this.defaultProvider = options.defaultProvider
    this.store = options.store
    this.methods = {
      identityManagerGetProviders: this.identityManagerGetProviders.bind(this),
      identityManagerGetIdentities: this.identityManagerGetIdentities.bind(this),
      identityManagerGetIdentity: this.identityManagerGetIdentity.bind(this),
      identityManagerCreateIdentity: this.identityManagerCreateIdentity.bind(this),
      identityManagerGetOrCreateIdentity: this.identityManagerGetOrCreateIdentity.bind(this),
      identityManagerImportIdentity: this.identityManagerImportIdentity.bind(this),
      identityManagerDeleteIdentity: this.identityManagerDeleteIdentity.bind(this),
      identityManagerAddKey: this.identityManagerAddKey.bind(this),
      identityManagerRemoveKey: this.identityManagerRemoveKey.bind(this),
      identityManagerAddService: this.identityManagerAddService.bind(this),
      identityManagerRemoveService: this.identityManagerRemoveService.bind(this),
    }
  }

  private getProvider(name: string): AbstractIdentityProvider {
    const provider = this.providers[name]
    if (!provider) throw Error('Identity provider does not exist: ' + name)
    return provider
  }

  async identityManagerGetProviders(): Promise<string[]> {
    return Object.keys(this.providers)
  }

  async identityManagerGetIdentities(): Promise<IIdentity[]> {
    return this.store.list()
  }

  async identityManagerGetIdentity({ did }: IIdentityManagerGetIdentityArgs): Promise<IIdentity> {
    return this.store.get({ did })
  }

  async identityManagerCreateIdentity(
    { provider, alias, kms, options }: IIdentityManagerCreateIdentityArgs,
    context: IAgentContext<IKeyManager>,
  ): Promise<IIdentity> {
    const providerName = provider || this.defaultProvider
    const identityProvider = this.getProvider(providerName)
    const partialIdentity = await identityProvider.createIdentity({ kms, alias, options }, context)
    const identity: IIdentity = { ...partialIdentity, alias, provider: providerName }
    await this.store.import(identity)
    return identity
  }

  async identityManagerGetOrCreateIdentity(
    { provider, alias, kms, options }: IIdentityManagerGetOrCreateIdentityArgs,
    context: IAgentContext<IKeyManager>,
  ): Promise<IIdentity> {
    try {
      const identity = await this.store.get({ alias })
      return identity
    } catch {
      return this.identityManagerCreateIdentity({ provider, alias, kms, options }, context)
    }
  }

  async identityManagerImportIdentity(identity: IIdentity): Promise<IIdentity> {
    await this.store.import(identity)
    return identity
  }

  async identityManagerDeleteIdentity(
    { did }: IIdentityManagerDeleteIdentityArgs,
    context: IAgentContext<IKeyManager>,
  ): Promise<boolean> {
    const identity = await this.store.get({ did })
    const provider = this.getProvider(identity.provider)
    await provider.deleteIdentity(identity, context)
    return this.store.delete({ did })
  }

  async identityManagerAddKey(
    { did, key, options }: IIdentityManagerAddKeyArgs,
    context: IAgentContext<IKeyManager>,
  ): Promise<any> {
    const identity = await this.store.get({ did })
    const provider = this.getProvider(identity.provider)
    const result = await provider.addKey({ identity, key, options }, context)
    identity.keys.push(key)
    await this.store.import(identity)
    return result
  }

  async identityManagerRemoveKey(
    { did, kid, options }: IIdentityManagerRemoveKeyArgs,
    context: IAgentContext<IKeyManager>,
  ): Promise<any> {
    const identity = await this.store.get({ did })
    const provider = this.getProvider(identity.provider)
    const result = await provider.removeKey({ identity, kid, options }, context)
    identity.keys = identity.keys.filter((k) => k.kid !== kid)
    await this.store.import(identity)
    return result
  }

  async identityManagerAddService(
    { did, service, options }: IIdentityManagerAddServiceArgs,
    context: IAgentContext<IKeyManager>,
  ): Promise<any> {
    const identity = await this.store.get({ did })
    const provider = this.getProvider(identity.provider)
    const result = await provider.addService({ identity, service, options }, context)
    identity.services.push(service)
    await this.store.import(identity)
    return result
  }

  async identityManagerRemoveService(
    { did, id, options }: IIdentityManagerRemoveServiceArgs,
    context: IAgentContext<IKeyManager>,
  ): Promise<any> {
    const identity = await this.store.get({ did })
    const provider = this.getProvider(identity.provider)
    const result = await provider.removeService({ identity, id, options }, context)
    identity.services = identity.services.filter((s) => s.id !== id)
    await this.store.import(identity)
    return result
  }
}