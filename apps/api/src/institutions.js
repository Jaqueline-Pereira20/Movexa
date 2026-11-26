// Domínios de e-mail aceitos no cadastro.
// Para incluir outra instituição ou domínio, basta editar esta lista.
const INSTITUTIONS = {
  IFCE: ['aluno.ifce.edu.br', 'ifce.edu.br'],
  Unifor: ['edu.unifor.br', 'unifor.br'],
  Unichristus: ['unichristus.edu.br', 'alu.unichristus.edu.br'],
  UFC: ['alu.ufc.br', 'ufc.br'],
  UECE: ['aluno.uece.br', 'uece.br']
};

// A comparação é exata: "ufc.br.exemplo.com" ou "falsaufc.br" não são aceitos.
function findInstitution(email) {
  const domain = email.slice(email.lastIndexOf('@') + 1).toLowerCase();
  const match = Object.entries(INSTITUTIONS).find(([, domains]) => domains.includes(domain));
  return match ? match[0] : null;
}

module.exports = { INSTITUTIONS, findInstitution };
