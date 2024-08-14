// SPDX-License-Identifier: MIT
// Koinos Group, Inc. (contact@koinos.group)

import { Arrays, authority, Crypto, Protobuf, Storage, System, value } from "@koinos/sdk-as";
import { mock_smart_wallet as mock} from "./proto/mock_smart_wallet";

const AUTHORIZATION_SPACE_ID = 0;

export class MockSmartWallet {

  authorizations: Storage.Map< Uint8Array, mock.authorization_object > = new Storage.Map(
    System.getContractId(),
    AUTHORIZATION_SPACE_ID,
    mock.authorization_object.decode,
    mock.authorization_object.encode
  );

  set_authorization(args: mock.set_authorization_arguments): mock.set_authorization_result {
    const keyBytes = Protobuf.encode(new mock.authorization_key(args.contract_id, args.entry_point), mock.authorization_key.encode);
    this.authorizations.put(keyBytes, new mock.authorization_object(args.value));

    return new mock.set_authorization_result();
  }

  clear_authorization(args: mock.clear_authorization_arguments): mock.clear_authorization_result {
    const keyBytes = Protobuf.encode(new mock.authorization_key(args.contract_id, args.entry_point), mock.authorization_key.encode);
    this.authorizations.remove(keyBytes);

    return new mock.clear_authorization_result();
  }

  authorize(args: authority.authorize_arguments): authority.authorize_result {
    if (args.type == authority.authorization_type.contract_call) {
      // Get contract with entry_point
      const key = new mock.authorization_key(args.call!.contract_id, args.call!.entry_point);
      let keyBytes = Protobuf.encode(key, mock.authorization_key.encode);

      let authorization = this.authorizations.get(keyBytes);
      if (authorization) {
        return new authority.authorize_result(authorization.value);
      }

      // Get contract, no entry_point
      key.entry_point = 0;
      keyBytes = Protobuf.encode(key, mock.authorization_key.encode);

      authorization = this.authorizations.get(keyBytes);
      if (authorization) {
        return new authority.authorize_result(authorization.value);
      }
    }

    // Get default override
    const key = new mock.authorization_key();
    const keyBytes = Protobuf.encode(key, mock.authorization_key.encode);

    const authorization = this.authorizations.get(keyBytes);
    if (authorization) {
      return new authority.authorize_result(authorization.value);
    }

    // Default to checking signature
    const trxId = System.getTransactionField("id")!.bytes_value;
    const sigBytes = System.getTransactionField("signatures")!.message_value!.value!;
    const signatures = Protobuf.decode< value.list_type >( sigBytes, value.list_type.decode );

    for (let i = 0; i < signatures.values.length; i++) {
      const publicKey = System.recoverPublicKey(signatures.values[i].bytes_value, trxId);
      const address = Crypto.addressFromPublicKey(publicKey!);

      if (Arrays.equal(System.getContractId(), address)) {
        return new authority.authorize_result(true);
      }
    }

    return new authority.authorize_result(false);
  }
}
