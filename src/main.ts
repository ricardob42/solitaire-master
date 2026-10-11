import { mount } from 'svelte';
import './styles/fonts.css';
import './styles/theme.css';
import './styles/base.css';
import './styles/backs.css';
import './styles/modal.css';
import App from './App.svelte';

mount(App, { target: document.getElementById('app')! });
