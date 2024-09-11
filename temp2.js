const bitcore = require('bitcore-lib');

const privateKey = new bitcore.PrivateKey('86684c90fbfa1187f0960a359351ddd14c3bc867c1bad6b39715131162d20f5e');
const address = privateKey.toAddress().toString();
console.log(address);

let utxos;  
// 使用 Blockstream API 获取 UTXO 数据
fetch(`https://blockstream.info/api/address/${address}/utxo`)
  .then(res => {
     utxos = res.data.txrefs
     console.log(utxos)
    }

  );

  const formattedUtxos = utxos.map(utxo => ({
    txId: utxo.txid,
    outputIndex: utxo.vout,
    address: address,
    script: bitcore.Script.buildPublicKeyHashOut(address).toString(),
    satoshis: utxo.value
  }));

const transaction = new bitcore.Transaction();
    transaction
    .from(formattedUtxos)
    .to('bc1p9j3jggj23kpr3rrgh5749zjmgwcawm5qlp89ukgrm79ar0jxgjwq982cjn', 49000)
    .change(address)
    .fee(1000)
    .sign(privateKey);


    const rawtx = transaction.serialize();

    // 使用 Blockstream API 广播交易
     fetch('https://blockstream.info/api/tx', {
      method: 'POST',
      body: rawtx,
      headers: {
        'Content-Type': 'text/plain'
      }
    });
