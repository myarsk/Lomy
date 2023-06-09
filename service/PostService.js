const PostRepository = require('../repository/PostRepository');
const CommentRepository = require('../repository/CommentRepository');
const CountryRepository = require('../repository/CountryRepository');
const TagRepository = require('../repository/TagRepository');
const TypeRepository = require('../repository/TypeRepository');
const UserRepository = require('../repository/UserRepository');
const RequestServiceImpl = require('../security/RequestServiceImpl');
const LomyVerifiedRepository = require('../repository/LomyVerifiedRepository');
const IPLogRepository = require('../repository/IPLogRepository');
const CreatPostDTO = require('../dto/CreatePostDTO')

class PostService {
  constructor() {
    this.postRepository =  PostRepository;
    this.commentRepository =  CommentRepository;
    this.countryRepository =  CountryRepository;
    this.tagRepository = TagRepository;
    this.typeRepository =  TypeRepository;
    this.userRepository = UserRepository;
    this.requestService = new RequestServiceImpl();
    this.lomyVerifiedRepository = LomyVerifiedRepository;
    this.ipLogRepository = IPLogRepository;
   this.creatPostDTO = new CreatPostDTO;
  }
}
async function createPost(createPostDTO, user, httpServletRequest) {
  let tag = await TagRepository.findByTag(createPostDTO.getTag());
  let verified;
  let verified1 = UNVERIFIED;
  if (!tag) {
      tag = await tagRepository.save(new Tag(createPostDTO.getTag(), 0.0, 0));
  }

  verified = await lomyVerifiedRepository.findByUserAndTag(user, tag);
  if (verified) {
      verified1 = VERIFIED;
  }

  const country = await countryRepository.findByCountry(createPostDTO.getCountry());
  const type = await typeRepository.findByType(createPostDTO.getType());
  let post = null;
  if (country && type) {
      post = new Post(
          createPostDTO.getPostText(),
          createPostDTO.getExperience(),
          createPostDTO.getVisible(),
          verified1,
          user,
          country,
          type,
          tag,
          createPostDTO.getRating()
      );
  }

  if (post) {
      tag.setRating(tag.getRating() + createPostDTO.getRating());
      tag.setNumberOfRaters(tag.getNumberOfRaters() + 1);
      await tagRepository.save(tag);
      const log = new IPLog(user, ActivityType.CREATE_POST);
      await ipLogRepository.save(log);
      console.log(`user: ${user.getUserName()}, have Email: ${user.getEmail()}, ip: ${requestService.getClientIP(httpServletRequest)}`);
      return postRepository.save(post);
  }

  return null;
}


 
  

// Define service class
class Service {
  // Define classifyPost method
  async classifyPost(result, user) {
    for (const p of result) {
      p.setAuthor(await postRepository.existsByUserIsAndIdIs(user, p.getId()));
      p.setDisliked(await commentRepository.existsByUserIsAndReactionIs(user, Reaction.DISLIKE));
      p.setLiked(await commentRepository.existsByUserIsAndReactionIs(user, Reaction.LIKE));
    }
    return result;
  }

  // Define getPosts method
  async getPosts(country1, type1, isExperience, pageable) {
    let result = [];
    if (!country1 && !type1) {
      result = await postRepository.findByIsExperienceAndPostStatus(isExperience, 2, pageable).getContent();
    } else if (!country1) {
      const type = await typeRepository.findByType(type1);
      if (type) {
        result = await postRepository.findByIsExperienceAndTypeAndPostStatus(isExperience, type, 2, pageable).getContent();
      }
    } else if (!type1) {
      const country = await countryRepository.findByCountry(country1);
      if (country) {
        result = await postRepository.findByIsExperienceAndCountryAndPostStatus(isExperience, country, 2, pageable).getContent();
      }
    }
    const country = await countryRepository.findByCountry(country1);
    const type = await typeRepository.findByType(type1);
    if (type && country) {
      result = await postRepository.findByIsExperienceAndCountryAndTypeAndPostStatus(isExperience, country, type, 2, pageable).getContent();
    }
  
    return result;
  }

  // Define getPostsByTag method
  async getPostsByTag(isExperience, tag1, pageable) {
    const tag2 = await tagRepository.findByTag(tag1);
    if (!tag2) {
      return null;
    }
    const tag = tag2;
    const posts = await postRepository.findByIsExperienceAndPostStatusAndTagLikeOrderByVerifiedDescLikesDesc(isExperience, 2, tag, pageable);
    return posts.getContent();
  }
}

// Export service class
module.exports = Service;
  
  async function classifyComments(comments, user) {
  for (const c of comments) {
    c.setAuthor(await commentRepository.existsByUserIsAndIdIs(user, c.getId()));
  }

  return comments;
}

async function addCommentToPost(commentDTO, user, httpServletRequest) {
  const post = await postRepository.findById(commentDTO.postId);
  if (!post) {
    return null;
  }
  // comment = commentRepository.findAllByUserAndPost(user.get(), post.get());
  // if (comment.isEmpty() || !comment.get().getComment().equals(commentDTO.getComment()))
  
  const comment = new Comment(post, commentDTO.visible, user);
  comment.setComment(commentDTO.comment);
  const log = new IPLog(user, ActivityType.ADD_COMMENT);
  await ipLogRepository.save(log);
  console.log(`user: ${user.getUserName()}, have Email: ${user.getEmail()}, ip: ${requestService.getClientIP(httpServletRequest)}`);
  return await commentRepository.save(comment);
}

async function getPostComments(postId) {
  const post = await postRepository.findById(postId);
  if (post) {
    return commentRepository.getAllByPost(post).
      filter(comment => comment.getComment() !== null);
  } else {
    return [];
  }
}
      
async function likePost(postId, user) {
  const post = await postRepository.findById(postId);

  if (!(user && post)) {
      return null;
  }

  let comment = await commentRepository.findByUserAndPostAndCommentIsNull(user, post);
  if (!comment) {
      comment = new Comment(post, Visible.INVISIBLE, user);
  }

  if (comment.getReaction() === Reaction.LIKE) {
      return null;
  } else if (comment.getReaction() === Reaction.DISLIKE) {
      comment.setReaction(Reaction.LIKE);
      post.setDislikes(post.getDislikes() - 1);
  }
  comment.setReaction(Reaction.LIKE);
  post.setLikes(post.getLikes() + 1);
  await commentRepository.save(comment);
  return await postRepository.save(post);
}


async function dislikePost(postId, user) {
  const post = await postRepository.findById(postId);

  if (!(user && post)) {
      return null;
  }

  let comment = await commentRepository.findByUserAndPostAndCommentIsNull(user, post);
  if (!comment) {
      comment = new Comment(post, Visible.INVISIBLE, user);
  }

  if (comment.getReaction() === Reaction.DISLIKE) {
      return null;
  } else if (comment.getReaction() === Reaction.LIKE) {
      comment.setReaction(Reaction.DISLIKE);
      post.setLikes(post.getLikes() - 1);
  }
  comment.setReaction(Reaction.DISLIKE);
  post.setDislikes(post.getDislikes() + 1);
  await commentRepository.save(comment);
  return await postRepository.save(post);
}


async function reportPost(postId) {
  const post = await postRepository.findById(postId);

  if (!post) {
      return null;
  }

  post.setNumberOfReports(post.getNumberOfReports() + 1);
  return await postRepository.save(post);
}

async function acceptPost(postId) {
  const post = await postRepository.findById(postId);

  if (!post) {
      return null;
  }

  post.setPostStatus(2);
  return await postRepository.save(post);
}
//exports.createPost = createPost;
module.exports = PostService;
