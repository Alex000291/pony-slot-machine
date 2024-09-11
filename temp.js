const bitcore = require('bitcore-lib');

const privateKey = bitcore.PrivateKey();
const publicKey = privateKey.toPublicKey();
const address = privateKey.toAddress().toString();

console.log(privateKey.toString(), publicKey.toString(), address);