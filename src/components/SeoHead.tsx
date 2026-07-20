import { Helmet } from 'react-helmet-async';

interface SeoHeadProps {
    title: string;
    description: string;
    path?: string;
    type?: string;
}

export function SeoHead({ title, description, path = '/', type = 'website' }: SeoHeadProps) {
    const url = `https://flashtests.app${path}`;
    const fullTitle = path === '/' ? title : `${title} | FlashTests`;

    return (
        <Helmet>
            <title>{fullTitle}</title>
            <meta name="description" content={description} />
            <link rel="canonical" href={url} />
            <meta property="og:url" content={url} />
            <meta property="og:title" content={fullTitle} />
            <meta property="og:description" content={description} />
            <meta property="og:type" content={type} />
            <meta name="twitter:title" content={fullTitle} />
            <meta name="twitter:description" content={description} />
        </Helmet>
    );
}
