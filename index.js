const app = require('./app');
const mongoose = require('mongoose');

mongoose.set('strictQuery', false);
mongoose.connect(process.env.BD_URL, {
  useUnifiedTopology: true,
  useNewUrlParser: true
}).then(() => {
  console.log('DB Connected to ', mongoose.connection.name);
})
.catch(err => {
  console.log(err.message)
});

const port = process.env.PORT || 8080;
app.listen(port)

console.log('server listen port', port)
