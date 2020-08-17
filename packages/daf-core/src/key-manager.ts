import { AbstractKeyStore } from './abstract/abstract-key-store'
import { AbstractKeyManagementSystem } from './abstract/abstract-key-management-system'
import { IKey, TKeyType, IAgentPlugin, IPluginMethodMap } from './types'

export interface IKeyManagerCreateKeyArgs {
  type: TKeyType
  kms: string
  meta?: Record<string, any>
}
export interface IKeyManagerGetKeyArgs {
  kid: string
}
export interface IKeyManagerDeleteKeyArgs {
  kid: string
}
export interface IKeyManagerEncryptJWEArgs {
  kid: string
  to: Omit<IKey, 'kms'>
  data: string
}
export interface IKeyManagerDecryptJWEArgs {
  kid: string
  data: string
}
export interface IKeyManagerSignJWTArgs {
  kid: string
  data: string
}
export interface IKeyManagerSignEthTXArgs {
  kid: string
  transaction: object
}

export interface IKeyManager extends IPluginMethodMap {
  keyManagerCreateKey(args: IKeyManagerCreateKeyArgs): Promise<IKey>
  keyManagerGetKey(args: IKeyManagerGetKeyArgs): Promise<IKey>
  keyManagerDeleteKey(args: IKeyManagerDeleteKeyArgs): Promise<boolean>
  keyManagerImportKey(args: IKey): Promise<boolean>
  keyManagerEncryptJWE(args: IKeyManagerEncryptJWEArgs): Promise<string>
  keyManagerDecryptJWE(args: IKeyManagerDecryptJWEArgs): Promise<string>
  keyManagerSignJWT(args: IKeyManagerSignJWTArgs): Promise<string>
  keyManagerSignEthTX(args: IKeyManagerSignEthTXArgs): Promise<string>
}
export class KeyManager implements IAgentPlugin {
  readonly methods: IKeyManager
  private store: AbstractKeyStore
  private kms: Record<string, AbstractKeyManagementSystem>

  constructor(options: { store: AbstractKeyStore; kms: Record<string, AbstractKeyManagementSystem> }) {
    this.store = options.store
    this.kms = options.kms
    this.methods = {
      keyManagerCreateKey: this.keyManagerCreateKey.bind(this),
      keyManagerGetKey: this.keyManagerGetKey.bind(this),
      keyManagerDeleteKey: this.keyManagerDeleteKey.bind(this),
      keyManagerImportKey: this.keyManagerImportKey.bind(this),
      keyManagerEncryptJWE: this.keyManagerDecryptJWE.bind(this),
      keyManagerDecryptJWE: this.keyManagerDecryptJWE.bind(this),
      keyManagerSignJWT: this.keyManagerSignJWT.bind(this),
      keyManagerSignEthTX: this.keyManagerSignEthTX.bind(this),
    }
  }

  private getKms(name: string): AbstractKeyManagementSystem {
    const kms = this.kms[name]
    if (!kms) throw Error('KMS does not exist: ' + name)
    return kms
  }

  async keyManagerCreateKey(args: IKeyManagerCreateKeyArgs): Promise<IKey> {
    const kms = this.getKms(args.kms)
    const partialKey = await kms.createKey({ type: args.type, meta: args.meta })
    const key: IKey = { ...partialKey, kms: args.kms }
    await this.store.import(key)
    if (key.privateKeyHex) {
      delete key.privateKeyHex
    }
    return key
  }

  async keyManagerGetKey({ kid }: IKeyManagerGetKeyArgs): Promise<IKey> {
    return this.store.get({ kid })
  }

  async keyManagerDeleteKey({ kid }: IKeyManagerDeleteKeyArgs): Promise<boolean> {
    const key = await this.store.get({ kid })
    const kms = this.getKms(key.kms)
    await kms.deleteKey({ kid })
    return this.store.delete({ kid })
  }

  async keyManagerImportKey(key: IKey): Promise<boolean> {
    return this.store.import(key)
  }

  async keyManagerEncryptJWE({ kid, to, data }: IKeyManagerEncryptJWEArgs): Promise<string> {
    const key = await this.store.get({ kid })
    const kms = this.getKms(key.kms)
    return kms.encryptJWE({ key, to, data })
  }

  async keyManagerDecryptJWE({ kid, data }: IKeyManagerDecryptJWEArgs): Promise<string> {
    const key = await this.store.get({ kid })
    const kms = this.getKms(key.kms)
    return kms.decryptJWE({ key, data })
  }

  async keyManagerSignJWT({ kid, data }: IKeyManagerSignJWTArgs): Promise<string> {
    const key = await this.store.get({ kid })
    const kms = this.getKms(key.kms)
    return kms.signJWT({ key, data })
  }

  async keyManagerSignEthTX({ kid, transaction }: IKeyManagerSignEthTXArgs): Promise<string> {
    const key = await this.store.get({ kid })
    const kms = this.getKms(key.kms)
    return kms.signEthTX({ key, transaction })
  }
}