import { info, warning } from '@actions/core';
import { GithubConfig, ProjectConfig, ProjectFlavor } from './config';
import { context, getOctokit } from '@actions/github';

function getDiffInfo(): { base: string; head: string } {
	const eventName = context.eventName;

	let base: string | undefined;
	let head: string | undefined;

	if (eventName === 'pull_request') {
		const pullRequestBase = (context.payload.pull_request as { base?: any }).base;
		const pullRequestHead = (context.payload.pull_request as { head?: any }).head;
		base = pullRequestBase.sha;
		head = pullRequestHead.sha;
	} else if (eventName === 'push') {
		base = context.payload.base_ref || context.payload.before;
		head = context.payload.after;
	} else {
		throw new Error(
			`This action only supports pull requests and pushes, ${context.eventName} events are not supported.`
		);
	}

	if (!base || !head) {
		throw new Error(`The base and head commits are missing from the payload for this ${context.eventName} event.`);
	}

	return { base, head };
}

async function getChangedFiles(config: GithubConfig): Promise<string[]> {
	const client = getOctokit(config.token);
	const diffInfo = getDiffInfo();

	info(`Base commit: ${diffInfo.base}`);
	info(`Head commit: ${diffInfo.head}`);

	try {
		const compareResponse = await client.rest.repos.compareCommitsWithBasehead({
			basehead: `${diffInfo.base}...${diffInfo.head}`,
			owner: context.repo.owner,
			repo: context.repo.repo,
		});

		if (compareResponse.status !== 200) {
			throw new Error(
				`The GitHub API for comparing the base and head commits for this ${context.eventName} event returned ${compareResponse.status}, expected 200.`
			);
		}

		if (compareResponse.data.status !== 'ahead') {
			warning(`The head commit for this ${context.eventName} event is not ahead of the base commit.`);
			warning('Skipping the changed file check.');
			return [];
		}

		return (compareResponse.data.files || []).map(file => file.filename);
	} catch {
		return [];
	}
}

export async function needNewDevClientBuild(config: GithubConfig & ProjectConfig): Promise<boolean> {
	if (config.projectFlavor === ProjectFlavor.ExpoGo) {
		return false;
	}

	const changedFiles = await getChangedFiles(config);

	const nativeFiles = changedFiles.filter(
		file =>
			file.endsWith('package.json') ||
			// Android files
			file.endsWith('.java') ||
			file.endsWith('.xml') ||
			file.endsWith('.gradle') ||
			file.endsWith('.properties') ||
			file.endsWith('.pro') ||
			file.endsWith('.kt') ||
			// iOS files
			file.endsWith('.h') ||
			file.endsWith('.m') ||
			file.endsWith('.mm') ||
			file.endsWith('.swift') ||
			file.endsWith('.podspec') ||
			file.endsWith('Podfile') ||
			file.endsWith('Podfile.lock') ||
			file.endsWith('.pbxproj') ||
			// C/C++ files
			file.endsWith('.c') ||
			file.endsWith('.cpp') ||
			file.endsWith('CMakeLists.txt')
	);

	info(`Changed native files:\n\t${nativeFiles.join('\n\t')}`);

	return nativeFiles.length > 0;
}
