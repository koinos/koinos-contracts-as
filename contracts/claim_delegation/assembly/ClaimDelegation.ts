import { authority, Base58, Crypto, Protobuf, error, System, StringBytes, claim, value, Arrays } from "@koinos/sdk-as";
import { protocol } from "@koinos/proto-as";

export class ClaimDelegation {
  private _claim_contract_id: Uint8Array;
  private _claim_entry: u32 = 0xdd1b3c31;
  private _check_claim_entry: u32 = 0x2ac66b4c;

  constructor() {
    this._claim_contract_id = BUILD_FOR_TESTING ? Base58.decode('19RgTeBJUE6rufk3yBwXYiHaFXAJymmVTb') : Base58.decode('15XWhAV99fSmz8z9vrA5j9rwwBpXMPHkBQ');
  }

  checkClaim(account: Uint8Array): claim.claim_status {
    let checkArgs = new claim.check_claim_arguments(account);
    let argsBytes = Protobuf.encode<claim.check_claim_arguments>(checkArgs, claim.check_claim_arguments.encode);

    let ret = System.call(this._claim_contract_id, this._check_claim_entry, argsBytes);

    if (ret.code != error.error_code.success)
      System.exit(ret.code, StringBytes.stringToBytes('failed to check claim'));

    let res = Protobuf.decode<claim.check_claim_result>(ret.res.object!, claim.check_claim_result.decode);

    return res.value != null ? res.value! : new claim.claim_status(0, false);
  }

  authorize(args: authority.authorize_arguments): authority.authorize_result {
    const contractId = System.getContractId();

    const transactionId = System.getTransactionField('id')!.bytes_value!;
    const signatures = Protobuf.decode<value.list_type>(System.getTransactionField('signatures')!.message_value!.value!, value.list_type.decode);
    for (let i = 0; i < signatures.values.length; i++) {
      const signature = signatures.values[i].bytes_value!;
      let recoveredKey = System.recoverPublicKey(signature, transactionId)!;
      const addr = Crypto.addressFromPublicKey(recoveredKey);
      if (Arrays.equal(addr, contractId)) {
        return new authority.authorize_result(true);
      }
    }

    if (args.type == authority.authorization_type.transaction_application) {
      const operations = Protobuf.decode<value.list_type>(System.getTransactionField('operations')!.message_value!.value!, value.list_type.decode);
      System.require(operations.values.length == 1, 'transaction must have only 1 operation');

      const operation = Protobuf.decode<protocol.operation>(operations.values[0].message_value!.value!, protocol.operation.decode);
      System.require(operation.call_contract != null, 'expected call contract operation');
      System.require(Arrays.equal(operation.call_contract!.contract_id, this._claim_contract_id), 'expected call contract operation to be the claim contract');
      System.require(operation.call_contract!.entry_point == this._claim_entry, 'expected call contract operation to be the claim entry point');

      System.require(operation.call_contract!.args != null, 'expected call contract arguments to not be null');
      const claimArgs = Protobuf.decode<claim.check_claim_arguments>(operation.call_contract!.args!, claim.check_claim_arguments.decode);

      System.require(claimArgs.eth_address != null, 'expected eth address to not be null');

      let claimStatus = this.checkClaim(claimArgs.eth_address!);
      if (claimStatus.claimed == false && claimStatus.token_amount > 0) {
        return new authority.authorize_result(true);
      }
    }

    return new authority.authorize_result(false);
  }
}
