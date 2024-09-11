const User = require('../models/user');
const bitcore = require('bitcore-lib');

const deposit = async (req, res) => {
  const privateKey = bitcore.PrivateKey();
  const publicKey = privateKey.toPublicKey();
  const address = privateKey.toAddress().toString();

  const user = await User.findOne({ username: req.body.username });

  user.balanceInfo.push({ privateKey: privateKey.toString(), publicKey: publicKey.toString(), address: address });

  await user.save();

  res.json(address)
}

async function settleDeposit(req, res) {
  // const user = await User.findOne({ username: req.body.username });

  // if (user.balanceInfo.length === 0) return res.json({ success: false, message: 'No balance info available' });

  // const latestBalanceInfo = user.balanceInfo[user.balanceInfo.length - 1];

  // if (latestBalanceInfo.settled) return res.json({ success: false, message: 'Already settled' });

  // const latestAddress = latestBalanceInfo.address;

  // fetch(`https://api.blockcypher.com/v1/btc/main/addrs/${latestAddress}/full`)
  //   .then(res => res.json())
  //   .then(json => {
  //     const balance = json.balance;
  //     console.log(balance);
  //     if (balance < 3600) return;
  //     user.balanceInfo[user.balanceInfo.length-1].balance = balance;
  //     user.balanceInfo[user.balanceInfo.length-1].settled = true;
  //     user.totalBalance += balance;
  //     user.save();
  //     res.json({ success: true, message: 'Deposit settled' });
    
  //   });

  const user = await User.findOne({ username: req.body.username });

  user.balanceInfo.forEach(async (balanceInfo) => {
    if (balanceInfo.settled) return;
    const address = balanceInfo.address;
    console.log(address);
    const response = await fetch(`https://api.blockcypher.com/v1/btc/main/addrs/${address}/full`);
    const json = await response.json();
    const balance = json.final_balance;
    console.log(balance)
    if (balance < 3600) return;
    balanceInfo.balance = balance;
    balanceInfo.settled = true;
    user.totalBalance += balance;
    await user.save();

  });


}

async function getBalance(req, res) {
  const user = await User.findOne({ username: req.body.username });
  res.json(user.totalBalance);
}

async function withdraw(req, res) {
  const user = await User.findOne({ username: req.body.username });
  const amount = parseInt(req.body.amount);
  const address = req.body.address;


  if (user.totalBalance < amount) return res.json({ success: false, message: 'Insufficient balance' });

  const privateKey = process.env.PRIVATE_KEY;
  const bankAddress = process.env.ADDRESS;
  let tx_hash;

  // 获取 UTXO 数据
  const utxosResponse = await fetch(`https://api.blockcypher.com/v1/btc/main/addrs/${bankAddress}?unspentOnly=true`);
  const utxosData = await utxosResponse.json();

  // 确保 UTXO 数据格式正确
  const utxos = utxosData.txrefs.map(utxo => ({
    txId: utxo.tx_hash,
    outputIndex: utxo.tx_output_n,
    address: bankAddress,
    script: bitcore.Script.buildPublicKeyHashOut(bankAddress).toString(),
    satoshis: utxo.value
  }));

  user.totalBalance -= amount;
  const transaction = new bitcore.Transaction()
    .from(utxos)
    .to(address, amount-1000)
    .change(bankAddress)
    .fee(1000)
    .sign(privateKey);

  const rawTransaction = transaction.serialize();
  fetch('https://api.blockcypher.com/v1/btc/main/txs/push', {
    method: 'POST',
    body: JSON.stringify({ tx: rawTransaction }),
    headers: {
      'Content-Type': 'application/json'
    }
  })
    .then(res => res.json())
    .then(json => {
      console.log(json);
      tx_hash = json.tx.hash;
    }
    );

  await user.save();
  res.json({ success: true, message: 'Withdrawal successful', tx_hash });
}

async function spin(req, res) {
  const user = await User.findOne({ username: req.body.username });
  const amount = parseInt(req.body.bet);

  if (user.totalBalance < amount) return res.json({ success: false, message: 'Insufficient balance' });

  user.totalBalance -= amount;

  const pool = ['couth', 'study', 'swag', 'care', 'apples', 'smile']

  const choice = (arr) => arr[Math.floor(Math.random() * arr.length)];

  const slot1 = choice(pool);
  const slot2 = choice(pool);
  const slot3 = choice(pool);

  let odds;

  if (slot1 === slot2 && slot2 === slot3) {
    odds = 15;
  } else if (slot1 === slot2 || slot2 === slot3 || slot1 === slot3) {
    odds = 2;
  } else {
    odds = 0;
  }

  const winnings = amount * odds;

  user.totalBalance += winnings;

  await user.save();

  res.json({ success: true, message: 'Spin successful', slot1, slot2, slot3, winnings });

}


module.exports = { deposit, settleDeposit, getBalance, withdraw, spin };
