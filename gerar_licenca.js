/**
 * ====================================================================
 * COUTOAPPS - GERADOR DE LICENÇAS OFICIAIS (ED25519)
 * ====================================================================
 * 
 * Este utilitário gera chaves de licença seguras usando assinatura digital Ed25519.
 * 
 * Uso:
 * 1. Gerar para esta máquina atual:
 *    node gerar_licenca.js
 * 
 * 2. Gerar para outra máquina (informando o HWID):
 *    node gerar_licenca.js <HWID>
 */

const crypto = require('crypto');
const { execSync } = require('child_process');

// CHAVE PRIVADA OFICIAL (Mantida em segredo absoluto pelo desenvolvedor)
const PRIVATE_KEY_HEX = "669fef8751f44285f4e86eb86f28006304251da44be09c9df3113de4c2606751";

// Reconstrói a chave privada a partir do Hex no formato esperado pelo Node
function getPrivateKeyFromHex(hex) {
  const privateBytes = Buffer.from(hex, 'hex');
  
  // Cabeçalho ASN.1 PKCS#8 para chave Ed25519
  const header = Buffer.from([
    0x30, 0x2e, 0x02, 0x01, 0x00, 0x30, 0x05, 0x06, 0x03, 0x2b, 0x65, 0x70, 0x04, 0x22, 0x04, 0x20
  ]);
  
  const der = Buffer.concat([header, privateBytes]);
  return crypto.createPrivateKey({
    key: der,
    format: 'der',
    type: 'pkcs8'
  });
}

// Função para obter o HWID da máquina atual
function getLocalHwid() {
  function getCmdOutput(cmd, args) {
    try {
      const output = execSync(`${cmd} ${args.join(' ')}`, { stdio: ['pipe', 'pipe', 'ignore'] }).toString();
      const lines = output.split('\n')
        .map(l => l.trim())
        .filter(l => {
          const lower = l.toLowerCase();
          return l.length > 0 &&
            lower !== 'uuid' &&
            lower !== 'processorid' &&
            lower !== 'serialnumber' &&
            lower !== 'to be filled by o.e.m.';
        });
      return lines.join('');
    } catch (e) {
      return '';
    }
  }

  let rawId = '';
  rawId += getCmdOutput('wmic', ['csproduct', 'get', 'uuid']);
  rawId += getCmdOutput('wmic', ['cpu', 'get', 'processorid']);
  rawId += getCmdOutput('wmic', ['diskdrive', 'get', 'serialnumber']);

  let cleaned = rawId.replace(/\s+/g, '');

  if (!cleaned || cleaned.toLowerCase().includes('to-be-filled-by-o.e.m.')) {
    const compName = process.env.COMPUTERNAME || 'UNKNOWN_COMP';
    const userName = process.env.USERNAME || 'UNKNOWN_USER';
    cleaned = `${compName}_${userName}`;
  }

  return crypto.createHash('sha256').update(cleaned).digest('hex');
}

// Início do Script
const args = process.argv.slice(2);
let targetEmail = args[0];
let targetLimit = parseInt(args[1], 10);

if (!targetEmail) {
  targetEmail = "joao@coutoapps.com";
}
if (isNaN(targetLimit) || targetLimit <= 0) {
  targetLimit = 2; // Padrão: 2 computadores ativados por licença
}

const randomId = crypto.randomBytes(6).toString('hex');
const licenseId = `couto_lic_${randomId}`;

console.log(`\nEmail do Cliente: \x1b[36m${targetEmail}\x1b[0m`);
console.log(`Limite de Dispositivos: \x1b[36m${targetLimit}\x1b[0m`);
console.log(`ID Único da Licença: \x1b[36m${licenseId}\x1b[0m`);

// 1. Cria o Payload da Licença Comercial (Sem HWID!)
const payload = {
  license_id: licenseId,
  email: targetEmail,
  device_limit: targetLimit,
  plan: "pro_premium",
  created_at: new Date().toISOString()
};

const payloadStr = JSON.stringify(payload);
const payloadHex = Buffer.from(payloadStr).toString('hex');

// 2. Assina o Payload usando a Chave Privada Ed25519
try {
  const privateKey = getPrivateKeyFromHex(PRIVATE_KEY_HEX);
  const signatureBuffer = crypto.sign(null, Buffer.from(payloadStr), privateKey);
  const signatureHex = signatureBuffer.toString('hex');

  // 3. Monta a Licença Final: PAYLOAD_HEX.SIGNATURE_HEX
  const licenseKey = `${payloadHex}.${signatureHex}`;

  console.log('\n\x1b[32m====================================================================\x1b[0m');
  console.log('\x1b[32m🌟 SUA CHAVE DE LICENÇA COMERCIAL GERADA COM SUCESSO! 🌟\x1b[0m');
  console.log('\x1b[32m====================================================================\x1b[0m\n');
  console.log(licenseKey);
  console.log('\n\x1b[33m👉 Envie este código para o e-mail do cliente para ativação automática!\x1b[0m\n');

} catch (err) {
  console.error('Erro ao gerar assinatura digital da licença:', err);
}
