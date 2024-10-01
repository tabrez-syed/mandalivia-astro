import { visit } from 'unist-util-visit';

export function remarkCustomImage() {
    return (tree) => {
        visit(tree, 'image', (node) => {
            const parts = (node.alt || '').split('|');
            let alt, align, width;

            if (parts.length === 1) {
                [alt] = parts;
            } else if (parts.length === 2) {
                [align, width] = parts;
            } else if (parts.length >= 3) {
                [alt, align, width] = parts;
            }

            node.alt = alt || '';
            node.data = node.data || {};
            node.data.hProperties = node.data.hProperties || {};

            let classes = ['rounded-lg', 'shadow-md'];

            if (align === 'center') {
                classes.push('mx-auto', 'block');
            } else if (align === 'left') {
                classes.push('float-left', 'mr-4');
            } else if (align === 'right') {
                classes.push('float-right', 'ml-4');
            }

            if (width) {
                node.data.hProperties.width = width;
                // Add responsive width classes
                classes.push(`max-w-[${width}px]`);
            }

            node.data.hProperties.class = classes.join(' ');
            console.log(node);
        });
    };
}
