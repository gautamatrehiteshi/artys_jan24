# Hyprledger Fabric chaincode

# What is this repository?
This repository contains a complete development environment for Hyperledger Fabric.
With this repository, you can:
- Start a fabric infrastructure Peer/Org/Orderer/API
- You can build and install/update your chaincode on the peer.
- You can interact directly with the blockchain via the API's swagger on this URL: http://localhost:4000/api

Testing setup is prepackaged in convenient docker images to provide on demand development environment with easy cleanup.

# What do I need/Prerequisites ?

Before you begin, ensure you have the following installed on your system:

- **Docker Desktop**  
  - Tested with **Docker Server v24.0.5** on Linux (Docker Desktop) 
- **Docker Compose** (v2.20.2-desktop.1 or later)
- **GNU Make** (v4.3 recommended)
- **Node.js** (v12.22.12 recommended) with **npm** or **yarn** for managing JavaScript dependencies
- **Git** (to clone the repository)
 - [x] docker
 - [ ] yarn/npm (optional) for local linter installation

# Running the code
The following commands will setup your development environment:
 - `yarn` or `npm install` to install a linter locally. Useful for development.
 - `make start` to spawn a development environment, deploy a blockchain and install the chaincode.


After running `make start`, you can manipulate the development environment with the following cmd:
- `make fabric` initiate and deploy a self contained fabric blockchain infrastructure.
- `make restart-fabric` clean and re-initiate the fabric infrastructure
- `make install v=*` build and install on the peer your local chaincode version. You need to manually update the version number.
- `make update v=*` build and update the local chaincode version. You need to manually update the version number.
- `make model` for regenerate a model.json.


Other useful commands:
 - `make test` run unit and functional tests. You need a deployed blockchain for the functional tests.
 - `make restart` restart from a fresh environment (useful to prevent side effects, cleanup containers, etc)
 - `make stats` provide informations on currently running docker containers on the host
 - `make teardown` completely remove any containers, images, leftovers on the system associated with that project
 - `make help` List out the different available commands

More commands and make options can be found in the makefile.


# API folder
To use the artys with fabric infrastructure, you need to have 3 files:
The .env.dev this file is good. You don't need to change it.
The model.json is the result of the `make model`. This your chaincode logic and registry. You need to update it after every new feature.
The channel1_profile.json is the network configuration for the fabric architecture. Normally you don't need to change it.


# Chaincode development (For joining devs - How to expand upon the code base)
The tooling provided in this artys can be found in the src repository, structured as follows:
 - a ***chaincode.js*** file, containing all the high level operations to query and invoke transactions.
 - a **utils** repository, providing all the essential tools to automate and simplify development.
 - a **models** repository. This is where the developer will define the different assets, transactions, queries, etc of the chaincode.
 - a **lib** repository where the user defined transactions will be stored.

## Designing the chaincode model
The Chaincode model is the heart of the logic. This is were you will define the different components and their interactions.
Taking the time to define a strong model will greatly improve the work involved in developping chaincode.

In the **models** repository, the ***model.js*** file must always be present.
It will export the entire model object for your Chaincode and the utility functions to interact with.

There are 5 differents structures present in a Chaincode model.
1. **Registries** define the different assets present on the Blockchain.
Each registry defined in the model has complete CRUD functionalities `createAsset`, `readAsset`, `updateAsset`, `deleteAsset` handled out of the box with the utils suite.
2. **Transactions** are all the operations publicly available on the Blockchain.
For a transaction to be executed on the Blockchain, it must first be defined in this section.
If some assets are linked and any creation or update of a given asset must also trigger side effects, it is possible to create custom behaviors by surcharging the CRUD operations. The surcharge transaction must follow the usual CRUD signature, but replace the Asset part with the asset name. You can find an example in the artys. Note the absence of camelCase for this function name, to respect the asset registry case (`deleteuser` to surcharge `deleteAsset` of Users).
3. **Queries** are executed directly on the couchDB engine.
Just like their transaction counterparts, for a query to be publicly available, it must first be defined in the model.
However, unlike the transactions this wont need to be implemented.
Their model structure is automatically handled by the utility package for out of the box querying with custom arguments.
4. **Concepts** defines custom assets that cannot be stored on the Ledger as standalones. This is useful to define complex/nested structure as a part of an existing asset.
5. **Enums** are used to identify list of strings for automatic type and arguments checking when calling the Chaincode.

The recommended structure is to separate the 5 components of the model in different files for readability purposes.
However this is not a requirement, so long as the model is being exported by the ***model.js*** file.

## Model rules
 - ***References***

A reference name must end with Id. ex in code:
 ```js
 assetId: { type: TYPE.string, subtype: SUBTYPE.ref, resource: REGISTRY.asset }
 ```
And in the generated JSON model
 ```json
 "assetId": { "type": "string", "subtype": "ref", "resource": "asset" }
 ```
This will enable GraphQL automatic resolution for the backend.

## Implementing custom transactions
### Regular transaction signature
While most basic transactions and CRUD operations are automatically handled by the utility package, you will most certainly need to be able to create custom transactions with complex logic.
Transactions should be stored in the lib folder.

The ***_transactions.js*** file is required. This is where all the publicly available transactions must be exported. Keep in mind that in order to be able to execute a transaction, it must also be defined in the model.

Much like the model components, the developer is free to structure the transactions however seems more convenient for them, as long as all the transactions are exported from the ***_transactions.js*** file.

All transactions must respect the following signature:
```
/**
 * @param stub { object } - the Ledger API object
 * @param payload { object } - Information passed to the transaction
 * @return { Operation[] } - returns a list of basic CRUD operations
 */
 ```
Each transaction will always result in a list, potentially empty, of basic CRUD operations. The list of operations will then be handled by the utility package, enabling dual relationship resolution.

### CRUD surcharge transaction signature
The only exception to this signature is for transactions that are surcharge of specific CRUD operators, in which case they take the following signature:
```
/**
 * @param stub { object } - the Ledger API object
 * @param registry { string } - the registry type on which to apply the operation
 * @param payload { object } - Information passed to the transaction
 * @return { Operation[] } - returns a list of basic CRUD operations
 */
 ```

### Operation signature
Operations are objects with the following properties:
 - ***operation*** is the basic CRUD operation to perform. It can be any one of  `createAsset`, `updateAsset`, `deleteAsset`, but it can also be a `query`. In the case of a query operation, nothing is added to the Ledger, the payload is to be returned as an output for the user. Useful when a transaction needs to return some data to the user.
 - ***registry*** is the registry to apply the modifications on.
 - ***payload*** is the asset object used to update the Ledger.
```
{
    operation: "createAsset" | "readAsset" | "updateAsset" | "deleteAsset" | "query",
    registry: "<registry>",
    payload: {...}
}
```

## Testing routine

You need to create two types of test **unit test** and **functional test**.

Tests are passed similarily to source files through volumes. There are 2 folders for tests.
 - Unit testing is done in ***test/unitTest*** and are executed directly in the development environment.
 - Functional tests are compiled in the development environment and can be packaged and deployed on a local Hyperledger Fabric Blockchain instance, using the VS Code extension.


