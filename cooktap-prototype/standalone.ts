import {mountKitchen} from './main';
import './standalone.css';

const kitchen = mountKitchen(document.getElementById('cooking-app')!);
if (import.meta.env.DEV) for (const name of ['NOTICE.txt', 'MIT.txt']) {
  kitchen.root.querySelector<HTMLAnchorElement>(`a[href="./${name}"]`)!.href = `./public/${name}`;
}
if (import.meta.hot) import.meta.hot.dispose(() => kitchen.dispose());
