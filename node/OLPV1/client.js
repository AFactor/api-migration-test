// 
// $ openssl genrsa 1024 > signer.key 
// $ openssl rsa -pubout < signer.key > signer.pub 
// 
 
var fs = require("fs"),
    xmldom = require("xmldom");
 
var DigitalSignature = require('xml-dsig');
var dsig = new DigitalSignature();

 
var xml = '<docs><doc id="doc-1"/><doc id="doc-2"/></docs>',
    doc = (new xmldom.DOMParser()).parseFromString(xml);
 
var options = {
  signatureOptions: {
    privateKey: fs.readFileSync("../../../cert/TESTCA2+RMG+IBM-API-Management-\(Pre-Prod\)+SAN+client.p12")
  }
};
 
var node = doc.documentElement;
 
var signature = dsig.createSignature( options,node);
    //enveloped = dsig.insertEnvelopedSignature(node, options);
 
console.log("Node");
 
console.log(node.toString());
console.log("Sig");
 
console.log(signature.toString());
console.log("Verify");
 
//console.log(enveloped.toString());
//console.log("");
 
console.log(dsig.verifySignature(signature, options,node));
console.log("");