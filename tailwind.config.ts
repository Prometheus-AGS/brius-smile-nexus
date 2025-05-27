
import type { Config } from "tailwindcss";

export default {
	darkMode: ["class"],
	content: [
		"./pages/**/*.{ts,tsx}",
		"./components/**/*.{ts,tsx}",
		"./app/**/*.{ts,tsx}",
		"./src/**/*.{ts,tsx}",
	],
	prefix: "",
	theme: {
		container: {
			center: true,
			padding: '2rem',
			screens: {
				'2xl': '1400px'
			}
		},
		extend: {
			fontFamily: {
				'display': ['Poppins', 'sans-serif'],
				'body': ['Open Sans', 'sans-serif'],
			},
			colors: {
				// Brius Brand Colors
				'brius-primary': '#007cbb',
				'brius-secondary': '#00aeef',
				'brius-accent': '#06bdea',
				'brius-white': '#ffffff',
				'brius-black': '#000000',
				'brius-gray-light': '#ebeae8',
				'brius-gray': '#abb8c3',

				// Shadcn Integration
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',
				primary: {
					DEFAULT: '#007cbb',
					foreground: '#ffffff'
				},
				secondary: {
					DEFAULT: '#00aeef',
					foreground: '#ffffff'
				},
				accent: {
					DEFAULT: '#06bdea',
					foreground: '#ffffff'
				},
				destructive: {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))'
				},
				muted: {
					DEFAULT: '#ebeae8',
					foreground: '#000000'
				},
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))'
				},
				card: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))'
				},
				sidebar: {
					DEFAULT: '#ffffff',
					foreground: '#000000',
					primary: '#007cbb',
					'primary-foreground': '#ffffff',
					accent: '#ebeae8',
					'accent-foreground': '#000000',
					border: '#abb8c3',
					ring: '#007cbb'
				}
			},
			backgroundImage: {
				'brius-gradient': 'linear-gradient(45deg, #007cbb 0%, #00aeef 100%)',
				'brius-gradient-reverse': 'linear-gradient(45deg, #00aeef 0%, #007cbb 100%)',
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)'
			},
			keyframes: {
				'accordion-down': {
					from: {
						height: '0'
					},
					to: {
						height: 'var(--radix-accordion-content-height)'
					}
				},
				'accordion-up': {
					from: {
						height: 'var(--radix-accordion-content-height)'
					},
					to: {
						height: '0'
					}
				}
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out'
			}
		}
	},
	plugins: [require("tailwindcss-animate")],
} satisfies Config;
