export const LINKEDIN_URL = 'https://www.linkedin.com/in/peter-ryszkiewicz/';
export const TWITTER_URL = 'https://x.com/pryszkie';
export const GITHUB_URL = 'https://github.com/pRizz/deep-dive';
export const MEDIUM_URL = 'https://medium.com/@peterryszkiewicz';
export const DOCKER_HUB_EXTENSION_URL = 'https://hub.docker.com/extensions/prizz/deep-dive';
export const GITHUB_ISSUES_URL = 'https://github.com/pRizz/deep-dive/issues';

export interface BadgeLink {
  label: string;
  imageUrl: string;
  href: string;
}

export const README_BADGES: BadgeLink[] = [
  {
    label: 'GitHub Stars',
    imageUrl: 'https://img.shields.io/github/stars/pRizz/deep-dive',
    href: 'https://github.com/pRizz/deep-dive',
  },
  {
    label: 'CI',
    imageUrl: 'https://github.com/pRizz/deep-dive/actions/workflows/ci.yml/badge.svg',
    href: 'https://github.com/pRizz/deep-dive/actions/workflows/ci.yml',
  },
  {
    label: 'Release',
    imageUrl: 'https://img.shields.io/github/v/release/pRizz/deep-dive?display_name=tag',
    href: 'https://github.com/pRizz/deep-dive/releases',
  },
  {
    label: 'Docker Image',
    imageUrl: 'https://img.shields.io/docker/v/prizz/deep-dive?sort=semver&label=prizz%2Fdeep-dive',
    href: 'https://hub.docker.com/r/prizz/deep-dive',
  },
  {
    label: 'Docker Pulls',
    imageUrl: 'https://img.shields.io/docker/pulls/prizz/deep-dive',
    href: 'https://hub.docker.com/r/prizz/deep-dive',
  },
  {
    label: 'Docker Image Size',
    imageUrl: 'https://img.shields.io/docker/image-size/prizz/deep-dive/latest',
    href: 'https://hub.docker.com/r/prizz/deep-dive',
  },
  {
    label: 'License',
    imageUrl: 'https://img.shields.io/github/license/pRizz/deep-dive',
    href: 'https://github.com/pRizz/deep-dive/blob/main/LICENSE',
  },
];
