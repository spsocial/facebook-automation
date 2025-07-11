import axios from 'axios';
import { logger } from '../utils/logger';

export class FacebookService {
  private accessToken: string;
  private apiVersion = 'v18.0';
  private baseURL = `https://graph.facebook.com/${this.apiVersion}`;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  // Get user's Facebook pages
  async getUserPages() {
    try {
      const response = await axios.get(`${this.baseURL}/me/accounts`, {
        params: {
          access_token: this.accessToken,
          fields: 'id,name,access_token,fan_count,picture',
        },
      });

      return response.data.data;
    } catch (error: any) {
      logger.error('Facebook API Error (getUserPages):', error.response?.data);
      throw new Error(error.response?.data?.error?.message || 'Failed to fetch pages');
    }
  }

  // Get page details
  async getPageDetails(pageId: string, pageAccessToken: string) {
    try {
      const response = await axios.get(`${this.baseURL}/${pageId}`, {
        params: {
          access_token: pageAccessToken,
          fields: 'id,name,fan_count,picture,cover,about,category',
        },
      });

      return response.data;
    } catch (error: any) {
      logger.error('Facebook API Error (getPageDetails):', error.response?.data);
      throw new Error(error.response?.data?.error?.message || 'Failed to fetch page details');
    }
  }

  // Send message to user
  async sendMessage(recipientId: string, message: any, pageAccessToken: string) {
    try {
      const response = await axios.post(
        `${this.baseURL}/me/messages`,
        {
          recipient: { id: recipientId },
          message,
        },
        {
          params: { access_token: pageAccessToken },
        }
      );

      return response.data;
    } catch (error: any) {
      logger.error('Facebook API Error (sendMessage):', error.response?.data);
      throw new Error(error.response?.data?.error?.message || 'Failed to send message');
    }
  }

  // Get page conversations (followers who can receive messages)
  async getPageConversations(pageAccessToken: string, limit = 100) {
    try {
      const response = await axios.get(`${this.baseURL}/me/conversations`, {
        params: {
          access_token: pageAccessToken,
          fields: 'participants,updated_time',
          limit,
        },
      });

      return response.data.data;
    } catch (error: any) {
      logger.error('Facebook API Error (getPageConversations):', error.response?.data);
      throw new Error(error.response?.data?.error?.message || 'Failed to fetch conversations');
    }
  }

  // Get post comments
  async getPostComments(postId: string, pageAccessToken: string, since?: string) {
    try {
      const params: any = {
        access_token: pageAccessToken,
        fields: 'id,from,message,created_time,parent,attachment',
        order: 'reverse_chronological',
        limit: 100,
      };

      if (since) {
        params.since = since;
      }

      const response = await axios.get(`${this.baseURL}/${postId}/comments`, { params });

      return response.data;
    } catch (error: any) {
      logger.error('Facebook API Error (getPostComments):', error.response?.data);
      throw new Error(error.response?.data?.error?.message || 'Failed to fetch comments');
    }
  }

  // Reply to comment
  async replyToComment(commentId: string, message: string, pageAccessToken: string) {
    try {
      const response = await axios.post(
        `${this.baseURL}/${commentId}/comments`,
        { message },
        {
          params: { access_token: pageAccessToken },
        }
      );

      return response.data;
    } catch (error: any) {
      logger.error('Facebook API Error (replyToComment):', error.response?.data);
      throw new Error(error.response?.data?.error?.message || 'Failed to reply to comment');
    }
  }

  // Get page posts
  async getPagePosts(pageId: string, pageAccessToken: string, limit = 25) {
    try {
      const response = await axios.get(`${this.baseURL}/${pageId}/posts`, {
        params: {
          access_token: pageAccessToken,
          fields: 'id,message,created_time,permalink_url,attachments{media}',
          limit,
        },
      });

      return response.data.data;
    } catch (error: any) {
      logger.error('Facebook API Error (getPagePosts):', error.response?.data);
      throw new Error(error.response?.data?.error?.message || 'Failed to fetch posts');
    }
  }

  // Subscribe page to webhooks
  async subscribePageToWebhooks(pageId: string, pageAccessToken: string) {
    try {
      const response = await axios.post(
        `${this.baseURL}/${pageId}/subscribed_apps`,
        {
          subscribed_fields: ['messages', 'messaging_postbacks', 'feed', 'mention'],
        },
        {
          params: { access_token: pageAccessToken },
        }
      );

      return response.data;
    } catch (error: any) {
      logger.error('Facebook API Error (subscribePageToWebhooks):', error.response?.data);
      throw new Error(error.response?.data?.error?.message || 'Failed to subscribe to webhooks');
    }
  }

  // Get post details by URL
  async getPostByUrl(postUrl: string, pageAccessToken: string) {
    try {
      // Extract post ID from URL
      const postIdMatch = postUrl.match(/\/posts\/(\d+)/);
      if (!postIdMatch) {
        throw new Error('Invalid post URL');
      }

      const postId = postIdMatch[1];
      const response = await axios.get(`${this.baseURL}/${postId}`, {
        params: {
          access_token: pageAccessToken,
          fields: 'id,message,created_time,permalink_url',
        },
      });

      return response.data;
    } catch (error: any) {
      logger.error('Facebook API Error (getPostByUrl):', error.response?.data);
      throw new Error(error.response?.data?.error?.message || 'Failed to fetch post');
    }
  }
}