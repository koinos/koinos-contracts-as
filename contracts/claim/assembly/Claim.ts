import { chain, System, Base64, Base58, Token, Crypto, claim, Arrays, StringBytes } from "koinos-sdk-as";

namespace State {
  export namespace Space {
    export const CLAIMS = new chain.object_space(true, System.getContractId(), 0);
    export const METADATA = new chain.object_space(true, System.getContractId(), 1);
  }
}

namespace Constants {
  export const KOIN_CONTRACT_ID = BUILD_FOR_TESTING ? Base58.decode('1BRmrUgtSQVUggoeE9weG4f7nidyydnYfQ') : Base58.decode('19JntSm8pSNETT9aHTwAUHC5RMoaSmgZPJ');
  export const INFO_KEY: Uint8Array = Base64.decode("EiA4c5Il0hdkaHX/LbRV8eIR3XKEzYZG05OFHrvxsbG6mQ==");
}

export class Claim {
  claim(args: claim.claim_arguments): claim.claim_result {
    const eth_address = args.eth_address!;
    const koin_address = args.koin_address!;
    const signature = args.signature!;

    // Ensure the claim exists and is still unclaimed
    let koin_claim = System.getObject<Uint8Array, claim.claim_status>(State.Space.CLAIMS, eth_address, claim.claim_status.decode);
    System.require(koin_claim != null, "no KOIN claim with that address exists");
    System.require(!koin_claim!.claimed, "KOIN has already been claimed for this address");

    // Verify the signature in the second slot against the given address
    const ethAddr = Arrays.toHexString(eth_address, true);
    const koinosAddr = Base58.encode(koin_address);
    const message = `claim koins ${ethAddr}:${koinosAddr}`;
    const digest = System.hash(Crypto.multicodec.keccak_256, StringBytes.stringToBytes(message));
    System.require(System.verifySignature(eth_address, signature, digest!));

    // Mint the koin
    const koin = new Token(Constants.KOIN_CONTRACT_ID);
    System.require(koin.mint(koin_address, koin_claim!.token_amount), "could not mint koin");

    // Update the record to signify that the claim has been made
    koin_claim!.claimed = true;
    System.putObject(State.Space.CLAIMS, eth_address, koin_claim!, claim.claim_status.encode);

    // Update the info object
    let info = System.getObject<Uint8Array, claim.claim_info>(State.Space.METADATA, Constants.INFO_KEY, claim.claim_info.decode);
    System.require(info != null, "claim info object not found");

    info!.koin_claimed += koin_claim!.token_amount;
    info!.eth_accounts_claimed += 1;
    System.putObject(State.Space.METADATA, Constants.INFO_KEY, info!, claim.claim_info.encode);

    return new claim.claim_result();
  }

  get_info(args: claim.get_info_arguments): claim.get_info_result {
    const info = System.getObject<Uint8Array, claim.claim_info>(State.Space.METADATA, Constants.INFO_KEY, claim.claim_info.decode);
    System.require(info != null, "claim info object not found");

    return new claim.get_info_result(info);
  }
}
