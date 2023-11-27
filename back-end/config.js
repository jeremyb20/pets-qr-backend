const jwt = require('jsonwebtoken');
const verification =  function verifyToken(req,res,next){
  if(!req.headers.authorization){
    return res.json({success: false, msg: 'You do not have permissions for this view'});
  }
  const token = req.headers.authorization.split(' ')[1];
  if (!token)
    return res.json({ success: false, msg: 'Token no existe.' });
  jwt.verify(token,process.env.SECRET, function(err, _decoded) {
    if (err){
     return res.json({ success: false, msg: 'Token ya expiró, inicie sesión nuevamente' }); 
    }
    
    next();
  });
}

module.exports = verification;
