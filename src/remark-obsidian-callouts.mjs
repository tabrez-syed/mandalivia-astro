import { visit } from 'unist-util-visit';

export function remarkObsidianCallouts() {
    return (tree) => {
        visit(tree, 'blockquote', (node) => {
            if (node.children.length > 0 && node.children[0].type === 'paragraph') {
                const firstParagraph = node.children[0];
                const firstChild = firstParagraph.children[0];
                if (firstChild && firstChild.type === 'text') {
                    const match = firstChild.value.match(/^\[!(\w+)\]\s*(.*)/);
                    if (match) {
                        const [, type, title] = match;

                        // Create the title node
                        const titleNode = {
                            type: 'paragraph',
                            children: [{ type: 'text', value: title }],
                            data: {
                                hProperties: {
                                    className: 'font-bold mb-2 text-lg'
                                }
                            }
                        };

                        // Remove the [!TYPE] line from the content
                        node.children.shift();

                        // Add the title node at the beginning
                        node.children.unshift(titleNode);

                        // Add Tailwind classes to the blockquote node
                        node.data = node.data || {};
                        node.data.hProperties = node.data.hProperties || {};
                        node.data.hProperties.className = `bg-gray-100 border-l-4 border-gray-500 rounded-lg p-4 my-4 ${getTypeClasses(type)}`;
                    }
                }
            }
        });
    };
}

function getTypeClasses(type) {
    switch (type.toLowerCase()) {
        case 'quote':
            return 'border-blue-500 bg-blue-50';
        case 'note':
            return 'border-yellow-500 bg-yellow-50';
        case 'warning':
            return 'border-red-500 bg-red-50';
        case 'info':
            return 'border-green-500 bg-green-50';
        default:
            return 'border-gray-500 bg-gray-50';
    }
}
