export const RELEASE_LABEL = import.meta.env.MODE === 'decorations-preview' ? 'Aménagement · prévisualisation v8' : 'Prairie de lapins · île à dix-huit parcelles · v11';
export const BUILD_REVISION: string = import.meta.env.VITE_BUILD_REVISION?.trim() || 'local';
