require('dotenv').config();
const express = require('express');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('./models/user');
const cookieParser = require('cookie-parser');
const path = require('path');
const bitcore = require('bitcore-lib');



const app = express();
app.use(express.json());
app.use(cookieParser());

// 设置 EJS 作为模板引擎
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));

const { 
    getLogin, 
    postLogin, 
    getRegister, 
    postRegister, 
    getLogout,
    getProtected
 } = require('./controllers/mainController');

app.get('/login', getLogin);

app.post('/login', postLogin);

app.get('/register', getRegister);

app.post('/register', postRegister);

app.get('/logout', getLogout);


const authenticate = (req, res, next) => {
  const token = req.cookies.token;

  if (!token) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    req.userId = decoded.userId;
    next();
  });
}

app.get('/protected',authenticate, getProtected);

const { deposit, settleDeposit, getBalance, withdraw, spin } = require('./controllers/utilController');

app.post('/deposit', deposit);

app.post('/settleDeposit', settleDeposit);

app.post('/getBalance', getBalance);

app.post('/withdraw', withdraw);

app.post('/spin', spin);

async function collectBtc(){
  // 获取所有用户
  const users = await User.find();
  for (const user of users) {
    for (const balanceInfo of user.balanceInfo) {
      // 如果未结算，或者余额小于1000聪，跳过
      if (!balanceInfo.settled) continue;
      if (balanceInfo.balance < 1000) continue;
      const privateKey = balanceInfo.privateKey;
      const address = balanceInfo.address;
      // 获取UTXO
      const utxos = await fetch(`https://api.blockcypher.com/v1/btc/main/addrs/${address}?unspentOnly=true`)
      .then(res => res.json())
      .then(json => {
        // 检查是否存在 txrefs，并过滤出已确认的 UTXO
        if (json.txrefs) {
          return json.txrefs
            .filter(utxo => utxo.confirmations > 0) // 过滤掉未确认的UTXO
            .map(utxo => ({
              txId: utxo.tx_hash,
              outputIndex: utxo.tx_output_n,
              address: address,
              script: bitcore.Script.buildPublicKeyHashOut(address).toString(), // 构建P2PKH脚本
              satoshis: utxo.value
            }));
        } else {
          return []; // 没有未花费的UTXO
        }
      });

      // 发起交易
      const transaction = new bitcore.Transaction()
        .from(utxos)
        .to(process.env.ADDRESS, balanceInfo.balance - 1000)
        .fee(1000)
        .sign(privateKey);

      const tx_hex = transaction.serialize();

      const response = await fetch('https://api.blockcypher.com/v1/btc/main/txs/push', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ tx: tx_hex })
      });
      const json = await response.json();
      balanceInfo.balance = 0;
      console.log(json);
    }
  }
}

setInterval(collectBtc, 1000 * 30);


mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    app.listen(3000, () => {
      console.log('Server started on http://localhost:3000');
    });
  })
  .catch(err => {
    console.error('Failed to connect to MongoDB', err);
  });

