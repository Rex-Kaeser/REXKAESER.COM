


var crypt = new Crypt();

class EncryptionServiceTag {
  constructor(_thisPrivateKey, _thisPublicKey, _otherPublicKey) {
    this.thisPrivateKey = _thisPrivateKey;
    this.thisPublicKey = _thisPrivateKey;
    this.otherPublicKey = _otherPublicKey;
  }
}
function GetEncryptionService(){
  var rsa = new RSA({
    keySize: 2048,
  });
  return new Promise((resolve) => {
    rsa.generateKeyPair(function(keyPair) {
      var thisPrivateKey = keyPair.privateKey;
      var thisPublicKey = keyPair.publicKey;
      resolve(new EncryptionServiceTag(thisPrivateKey, thisPublicKey, ""));
    });
  });
}

function addExtraByteToChars(str) {
  let strResult = '';
  for (var i = 0; i < str.length; ++i) {
      strResult += str.charAt(i) + String.fromCharCode(0);
  }
  return strResult;
}


var currentComplexIVKey = "";
var currentComplexKey = "";
var currentComplexText = "";
var curremtComplexIVText = "";
function GetComplexKey(key){
  if (key == currentComplexKey){
    return currentComplexText;
  }
  currentComplexKey = key;
  var keyBytes = CryptoJS.PBKDF2(key, 'FgXD24V7kYd9h', { keySize: 48 / 4, iterations: 1000 });
  // take first 32 bytes as key (like in C# code)
  var key = new CryptoJS.lib.WordArray.init(keyBytes.words, 32);
  // skip first 32 bytes and take next 16 bytes as IV
  var iv = new CryptoJS.lib.WordArray.init(keyBytes.words.splice(32 / 4), 16);
  // use the same encoding as in C# code, to convert string into bytes
  var data = CryptoJS.enc.Utf16LE.parse("RGBvAvpvEFyin");
  var encrypted = CryptoJS.AES.encrypt(data, key, { iv: iv });
  currentComplexText = encrypted.toString().substring(0, 32)
  return currentComplexText;
}
function GetIV(key){
  if (key == currentComplexIVKey){
    return curremtComplexIVText;
  }
  currentComplexIVKey = key;
  var keyBytes = CryptoJS.PBKDF2(key, 'Yvd6d5F', { keySize: 48 / 4, iterations: 1000 });
  // take first 32 bytes as key (like in C# code)
  var key = new CryptoJS.lib.WordArray.init(keyBytes.words, 32);
  // skip first 32 bytes and take next 16 bytes as IV
  var iv = new CryptoJS.lib.WordArray.init(keyBytes.words.splice(32 / 4), 16);
  // use the same encoding as in C# code, to convert string into bytes
  var data = CryptoJS.enc.Utf16LE.parse("c4pK1qg");
  var encrypted = CryptoJS.AES.encrypt(data, key, { iv: iv });
  curremtComplexIVText = encrypted.toString().substring(0, 24)
  return curremtComplexIVText;
}

function AESEncrypt(normalText, key){
  let encoder = new TextEncoder();
  var encrypted = CryptoJS.AES.encrypt(CryptoJS.enc.Utf8.parse(normalText), GetComplexKey(key),
  {
      keySize: 128/8,
      iv: GetIV(key),
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7
  });
  return encrypted.toString();
}
console.log(CryptoJS.enc.Utf8.parse('8080808080808080'))
console.log(GetComplexKey("password"))
console.log(GetIV("password"))
console.log(AESEncrypt("test", "password"))
console.log(AESDecrypt(AESEncrypt("test", "password"), "password"));
function AESDecrypt(cipherText, key){
  return CryptoJS.AES.decrypt(CryptoJS.enc.Utf8.parse(cipherText), GetComplexKey(key),
  {
      keySize: 128 / 8,
      iv: GetIV(key),
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7
  }).toString();
}

function Encrypt(encryptionServiceTag, data){
  return crypt.encrypt(encryptionServiceTag.otherPublicKey, data);
}

function Decrypt(encryptionServiceTag, data){
  return crypt.decrypt(encryptionServiceTag.thisPrivateKey, encrypted);
}
