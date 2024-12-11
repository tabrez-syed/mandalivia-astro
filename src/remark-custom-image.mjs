import { visit } from 'unist-util-visit';

export function remarkCustomImage() {
    return (tree) => {
        visit(tree, 'text', (node, index, parent) => {
            const regex = /!\[\[(.*?)\]\]/;
            const match = node.value.match(regex);

            if (match) {
                const parts = match[1].split('|').map((part) => part.trim());
                const [imagePath, align, dimensions] = parts;

                // Create image node
                const imageNode = {
                    type: 'image',
                    url: imagePath,
                    alt: '',
                    data: {
                        hProperties: {
                            class: ['rounded-lg', 'shadow-md']
                        }
                    }
                };

                // Handle alignment
                if (align === 'center') {
                    imageNode.data.hProperties.class.push('mx-auto', 'block');
                } else if (align === 'left') {
                    imageNode.data.hProperties.class.push('float-left', 'mr-4');
                } else if (align === 'right') {
                    imageNode.data.hProperties.class.push('float-right', 'ml-4');
                }

                // Handle dimensions
                if (dimensions) {
                    const [width, height] = dimensions.split('x');
                    if (width) {
                        imageNode.data.hProperties.width = width;
                        imageNode.data.hProperties.class.push(`max-w-[${width}px]`);
                    }
                    if (height) {
                        imageNode.data.hProperties.height = height;
                    }
                }

                // Join classes with space
                imageNode.data.hProperties.class = imageNode.data.hProperties.class.join(' ');

                // Replace text node with image node
                parent.children[index] = imageNode;
            }
        });
    };
}
