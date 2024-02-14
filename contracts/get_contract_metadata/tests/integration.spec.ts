/* eslint-disable @typescript-eslint/ban-ts-comment */
import { Contract, LocalKoinos, Serializer, Token } from '@roamin/local-koinos';

import * as abi from './test_contract-abi.json';
// @ts-ignore koilib_types is needed when using koilib
abi.koilib_types = abi.types;

jest.setTimeout(600000);

let localKoinos = new LocalKoinos();

if (process.env.ENV === 'DEVCONTAINER') {
  localKoinos = new LocalKoinos({
    rpc: 'http://host.docker.internal:8080',
    amqp: 'amqp://host.docker.internal:5672'
  });
}

const [
  genesis,
  koinAccount,
  getContractMetadataAccount,
  testContractAccount,
  user1
] = localKoinos.getAccounts();

let testContract: Contract;

beforeAll(async () => {
  // start local-koinos node
  await localKoinos.startNode();

  await localKoinos.deployKoinContract({ mode: 'manual' });
  await localKoinos.mintKoinDefaultAccounts({ mode: 'manual' });
  await localKoinos.deployNameServiceContract({ mode: 'manual' });
  await localKoinos.setNameServiceRecord('koin', koinAccount.address, { mode: 'manual' });
  await localKoinos.startBlockProduction();
});

afterAll(async () => {
  // stop local-koinos node
  await localKoinos.stopNode();
});

describe('get contract metadata', () => {
  it("should/not get a contract's metadata", async () => {

    // deploy get_contract_metadata contract
    await localKoinos.deployContract(
      getContractMetadataAccount.wif,
      './build/release/contract.wasm',
      // @ts-ignore abi is compatible
      abi,
    );

    // set get_contract_metadata contract as system contract and system call
    await localKoinos.setSystemContract(getContractMetadataAccount.address, true);
    await localKoinos.setSystemCall(112, getContractMetadataAccount.address, 0x784faa08);

    // deploy test contract that calls the new system call
    testContract = await localKoinos.deployContract(
      testContractAccount.wif,
      './tests/test_contract.wasm',
      // @ts-ignore abi is compatible
      abi,
      {},
      {
        authorizesCallContract: true,        
        authorizesTransactionApplication: true,        
        authorizesUploadContract: true        
      }
    );

    // get contract metadata for koin contract
    let res = await testContract.functions.get_contract_metadata({
      contract_id: koinAccount.address
    });

    expect(res.result).toStrictEqual({
      contract_metadata: {
        hash: 'EiAot1rjcg97LtIBRDnllB3DwffaIA7tlsaMSmzEUoZ-cQ==',
        system: true
      }
    });

    // get the test contract's metadata
    res = await testContract.functions.get_contract_metadata({
      contract_id: testContractAccount.address
    });

    expect(res.result).toStrictEqual({
      contract_metadata: {
        hash: 'EiAGCLA6mLO1IDwu5dUjbAqQNv_j5K4LsVctV0GoCwp1yQ==',
        authorizes_call_contract: true,
        authorizes_transaction_application: true,
        authorizes_upload_contract: true
      }
    });

    // get a contract that does not exist
    res = await testContract.functions.get_contract_metadata({
      contract_id: user1.address
    });

    expect(res.result).toBeUndefined();
  });
});