import { styled } from "@mui/material";

export const SocialContainer = styled('div')({
    display: 'flex',
    justifyContent: 'center',
    gap: '15px',
    marginTop: '20px',
});

export const IconWrapper = styled('div')({
    width: '45px',
    height: '45px',
    borderRadius: '50%',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f4f4f4',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',

    '&:hover': {
        transform: 'scale(1.1)',
        backgroundColor: '#ddd',
    },

    'svg': {
        fontSize: '30px',
        transition: 'color 0.3s ease',
        color: 'rgb(63, 8, 17)'
    },
    '&:hover svg': {
        color: 'rgb(90, 23, 34)'
    }
});
