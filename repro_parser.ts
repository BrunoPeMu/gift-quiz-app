import { parseGIFT } from './src/lib/giftParser';

const gift = `
// Test Question
Question text {
=Dotación de los créditos necesarios para su puesta en marcha y funcionamiento. #¡Correcto! La Ley exige la determinación de su integración y dependencia, la delimitación de funciones y la dotación presupuestaria [7, 8].
~La publicación de su creación en el Boletín Oficial del Estado (BOE), sin excepción. #Incorrecto. Aunque es práctica habitual...
~Que suponga una duplicación... #Incorrecto. Se prohíbe...
~Que su actuación tenga efectos... #Incorrecto. Para tener...
}
`;

const questions = parseGIFT(gift);
console.log(JSON.stringify(questions, null, 2));
