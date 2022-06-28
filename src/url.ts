import { ProjectFlavor } from './config';

const generateQRCodeBaseURLForGo = 'https://api.qrserver.com/v1/create-qr-code/?size=512x512&data=exp://exp.host';
const generateQRCodeBaseURLForBare = 'https://chart.googleapis.com/chart?cht=qr&chs=360x360&choe=UTF-8&chld=L|2'

export function createQRCodeURL(projectFlavor: ProjectFlavor, manifestURL: string, scheme: string): string {
	if (projectFlavor === ProjectFlavor.DevelopmentClient) {
		return `${generateQRCodeBaseURLForBare}&chl=${scheme}://expo-development-client/?url=${manifestURL}`
	} else if (projectFlavor === ProjectFlavor.ExpoGo) {
		return `${generateQRCodeBaseURLForGo}/${manifestURL}`;
	}

	throw new Error('Unknown project flavor.');
}
