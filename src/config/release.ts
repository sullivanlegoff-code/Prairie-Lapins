export const RELEASE_LABEL = import.meta.env.MODE === 'decorations-preview' ? 'Aménagement · prévisualisation v8' : 'Prairie de lapins · île à neuf parcelles · v10';
export const BUILD_REVISION: string = import.meta.env.VITE_BUILD_REVISION?.trim() || 'local';
