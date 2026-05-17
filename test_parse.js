const text = `Martes 7 de abril de 2026

Titular:
Recuerdan en Bayamo a Vilma Espín en el 96 aniversario de su nacimiento

Fuente:
Redacción RCM

Texto:
La combatiente Vilma Espín Guillois fue recordada este martes en la histórica Plaza de la Revolución de Bayamo, en el aniversario 96 de su nacimiento.

Titular:
Convoca Central de Trabajadores en Granma a jornada de trabajo voluntario por el Primero de Mayo

Fuente:
Redacción RCM

Texto:
Un trabajo voluntario convocado por la Central de Trabajadores de Cuba en Granma se realizó en la finca "La Reyna".`;

const lines = text.split('\n');
const date = lines[0].trim();
const content = lines.slice(1).join('\n');
const blocks = content.split(/Titular:/i).filter(b => b.trim());

const parsedNews = blocks.map((block, index) => {
    const sourceMatch = block.match(/Fuente:\s*([\s\S]*?)(?=\n\n|\nTexto|Texto|$)/i);
    const textoMatch = block.match(/Texto:\s*([\s\S]*?)$/i);
    
    const title = block.split('\n')[0].trim();
    const source = sourceMatch ? sourceMatch[1].trim() : 'Anónimo';
    const content = textoMatch ? textoMatch[1].trim() : '';
    
    return {
        title,
        source,
        content,
        date
    };
});

console.log(parsedNews);
